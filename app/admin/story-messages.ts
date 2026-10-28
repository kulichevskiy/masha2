// Result shape and the Russian validation messages of the story actions.
// Kept outside the 'use server' module, which may export only async functions.
export type ActionResult = { error?: string }

export const SLUG_ERROR = 'Слаг: только строчные латинские буквы, цифры и дефисы'
export const TITLE_ERROR = 'Название не может быть пустым'
export const SLUG_TAKEN_ERROR = 'Такой слаг уже занят'
export const CREDIT_ROLE_ERROR = 'У каждой строки кредитов должна быть роль'
