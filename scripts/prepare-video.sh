#!/usr/bin/env bash
#
# Prepare a video for upload to the portfolio.
#
# Re-encodes source clips (typically straight off an iPhone) into web-ready mp4:
# smaller, streamable, and stripped of camera metadata. The result is what you
# drag into the admin dropzone — the admin reads duration and frame size from
# the file itself and grabs the poster frame in the browser.
#
# Usage:
#   scripts/prepare-video.sh <file-or-dir> [<file-or-dir> ...]
#   scripts/prepare-video.sh --crf 18 ~/Downloads/masha_video
#   scripts/prepare-video.sh --out ~/Desktop/ready clip.MOV
#
# Options:
#   --crf <n>     Quality, lower is better. 18 near-transparent, 21 default,
#                 24 visibly cheaper. (default: 21)
#   --crop <mode> auto  — detect and cut letterbox/pillarbox black bars
#                 off   — keep the frame as shot (default)
#                 w:h:x:y — cut exactly this rectangle
#   --max <px>    Cap the long edge; never upscales. (default: 1920)
#   --out <dir>   Output directory. (default: ./prepared next to the input)
#   --keep-audio-quality
#                 Encode audio at 192k instead of 128k.
#   --dry-run     Print what would run, encode nothing.
#
set -euo pipefail

CRF=21
CROP=off
MAX_EDGE=1920
AUDIO_BITRATE=128k
OUT_DIR=""
DRY_RUN=false
INPUTS=()

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --crf) CRF="${2:-}"; [[ -n $CRF ]] || die "--crf needs a value"; shift 2 ;;
    --crop) CROP="${2:-}"; [[ -n $CROP ]] || die "--crop needs a value"; shift 2 ;;
    --max) MAX_EDGE="${2:-}"; [[ -n $MAX_EDGE ]] || die "--max needs a value"; shift 2 ;;
    --out) OUT_DIR="${2:-}"; [[ -n $OUT_DIR ]] || die "--out needs a value"; shift 2 ;;
    --keep-audio-quality) AUDIO_BITRATE=192k; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) INPUTS+=("$1"); shift ;;
  esac
done

[[ ${#INPUTS[@]} -gt 0 ]] || die "no input given. See --help."
command -v ffmpeg >/dev/null || die "ffmpeg not found. Install it: brew install ffmpeg"
command -v ffprobe >/dev/null || die "ffprobe not found. Install it: brew install ffmpeg"

# Collect source files: a directory contributes its video files, one level deep.
SOURCES=()
for input in "${INPUTS[@]}"; do
  if [[ -d $input ]]; then
    while IFS= read -r found; do SOURCES+=("$found"); done < <(
      find "$input" -maxdepth 1 -type f \
        \( -iname '*.mov' -o -iname '*.mp4' -o -iname '*.m4v' -o -iname '*.avi' -o -iname '*.mkv' \) \
        | sort
    )
  elif [[ -f $input ]]; then
    SOURCES+=("$input")
  else
    die "no such file or directory: $input"
  fi
done

[[ ${#SOURCES[@]} -gt 0 ]] || die "no video files found in the given paths."

human_size() {
  local bytes=$1
  awk -v b="$bytes" 'BEGIN {
    if (b < 1048576) printf "%.0f KB", b / 1024
    else printf "%.1f MB", b / 1048576
  }'
}

total_before=0
total_after=0

for src in "${SOURCES[@]}"; do
  src_dir="$(cd "$(dirname "$src")" && pwd)"
  dest_dir="${OUT_DIR:-$src_dir/prepared}"
  mkdir -p "$dest_dir"

  base="$(basename "${src%.*}")"
  dest="$dest_dir/$base.mp4"

  # Read the source so we can report what changed and skip pointless upscaling.
  read -r in_w in_h in_dur < <(
    ffprobe -v error -select_streams v:0 \
      -show_entries stream=width,height:format=duration \
      -of default=noprint_wrappers=1:nokey=1 "$src" | paste -sd' ' -
  )
  has_audio=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" | head -1)

  printf '\n%s  %sx%s  %ss  %s\n' \
    "$(basename "$src")" "$in_w" "$in_h" "${in_dur%.*}" "$(human_size "$(stat -f%z "$src")")"

  # Cut black bars first, so everything downstream sees the real frame.
  crop_filter=""
  crop_w=$in_w
  crop_h=$in_h
  case "$CROP" in
    off) ;;
    auto)
      # Sample eight seconds past the opening and take the steady-state verdict;
      # the very first frames are often a fade and would report a false crop.
      detected=$(
        ffmpeg -hide_banner -ss 2 -i "$src" -t 8 \
          -vf "cropdetect=limit=24:round=2:reset=0" -f null - 2>&1 \
          | grep -o 'crop=[0-9]*:[0-9]*:[0-9]*:[0-9]*' | tail -1 | cut -d= -f2
      )
      if [[ -z $detected ]]; then
        printf '  note: could not detect black bars, keeping the full frame.\n'
      else
        IFS=: read -r crop_w crop_h _ _ <<<"$detected"
        if (( crop_w == in_w && crop_h == in_h )); then
          printf '  no black bars found, keeping the full frame.\n'
          crop_w=$in_w; crop_h=$in_h
        else
          crop_filter="crop=$detected,"
          printf '  cropping to %sx%s (was %sx%s)\n' "$crop_w" "$crop_h" "$in_w" "$in_h"
        fi
      fi
      ;;
    *:*:*:*)
      crop_filter="crop=$CROP,"
      IFS=: read -r crop_w crop_h _ _ <<<"$CROP"
      printf '  cropping to %sx%s (was %sx%s)\n' "$crop_w" "$crop_h" "$in_w" "$in_h"
      ;;
    *) die "--crop expects auto, off, or w:h:x:y — got: $CROP" ;;
  esac

  # Scale only when the long edge exceeds the cap. -2 keeps the other edge even,
  # which H.264 requires, and preserves the aspect ratio exactly.
  if (( crop_w >= crop_h )); then
    scale_filter="scale='min($MAX_EDGE,iw)':-2"
  else
    scale_filter="scale=-2:'min($MAX_EDGE,ih)'"
  fi

  ff_args=(
    -hide_banner -loglevel warning -stats
    -i "$src"
    -map_metadata -1          # drop camera metadata, including GPS location
    -map 0:v:0
    -vf "${crop_filter}${scale_filter}"
    -c:v libx264
    -preset slow              # spend encode time to buy bitrate
    -crf "$CRF"
    -profile:v high -level:v 4.0
    -pix_fmt yuv420p          # required by Safari and most hardware decoders
    -movflags +faststart      # moov atom first: playback can start on the first
                              # bytes, which is what hover preview relies on
  )

  if [[ -n $has_audio ]]; then
    ff_args+=(-map 0:a:0 -c:a aac -b:a "$AUDIO_BITRATE" -ac 2)
  else
    ff_args+=(-an)
  fi

  ff_args+=(-y "$dest")

  if $DRY_RUN; then
    printf '  would run: ffmpeg %s\n' "${ff_args[*]}"
    continue
  fi

  ffmpeg "${ff_args[@]}"

  before=$(stat -f%z "$src")
  after=$(stat -f%z "$dest")
  total_before=$((total_before + before))
  total_after=$((total_after + after))

  read -r out_w out_h < <(
    ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
      -of default=noprint_wrappers=1:nokey=1 "$dest" | paste -sd' ' -
  )

  printf '  → %s  %sx%s  %s  (%s%% smaller)\n' \
    "$dest" "$out_w" "$out_h" "$(human_size "$after")" \
    "$(awk -v a="$before" -v b="$after" 'BEGIN { printf "%.0f", (1 - b/a) * 100 }')"

  if (( after > before )); then
    printf '  note: output is larger than the source — try a higher --crf, or upload the original.\n'
  fi
done

if ! $DRY_RUN && (( total_before > 0 )); then
  printf '\ntotal: %s → %s (%s%% smaller)\n' \
    "$(human_size "$total_before")" "$(human_size "$total_after")" \
    "$(awk -v a="$total_before" -v b="$total_after" 'BEGIN { printf "%.0f", (1 - b/a) * 100 }')"
  printf 'Upload the prepared .mp4 files through the admin dropzone.\n'
fi
