// Where the in-app feedback form sends its answers (SPEC D52). The owner fills this in once; docs/FEEDBACK-SETUP.md has
// the steps. Until formAction is filled in, the Send button opens the mail app instead (the same as "Email it instead").
//
// How to fill it in:
// 1. formAction: the Google Form's answer address. Take the form's link, which looks like
//      https://docs.google.com/forms/d/e/<FORM_ID>/viewform
//    and change the last word "viewform" to "formResponse":
//      https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
// 2. fields: the number of each question in the form. In the form editor: the three dots menu, "Get pre-filled link",
//    type anything into every question, "Get link", copy it. The link has parts like entry.123456789=... ; each
//    entry.NNN belongs to one question, in the same order as the questions. Put 'entry.123456789' (with the word
//    "entry.") next to the matching name below. A field left as '' is simply not sent.
//      fun = 1 How fun (1 to 5), feel = 2 Popping feel, comics = 3 Comic strips, stopped = 4 Stopped early (the choice
//      and the text together), confusing = 5 Confusing, broken = 6 Broken or wrong (the choice and the text together),
//      smooth = 7 Ran smoothly, more = 8 Play more, phone = 9 Phone model, else = 10 Anything else, name = Name,
//      auto = Game info (version, phone and browser, screen, progress, play time, Lighter graphics, app or browser).
// 3. email: the address "Email it instead" sends to. Left as '' the mail app still opens, and the tester types the address.
// Nothing here is secret: a Google Form address is safe to have in the game.

/** The feedback form's address, its field ids and the mail address (all empty until the owner sets up the form). */
export const FEEDBACK_CONFIG = {
  formAction: '',
  fields: {
    fun: '',
    feel: '',
    comics: '',
    stopped: '',
    confusing: '',
    broken: '',
    smooth: '',
    more: '',
    phone: '',
    else: '',
    name: '',
    auto: '',
  },
  email: '',
};
