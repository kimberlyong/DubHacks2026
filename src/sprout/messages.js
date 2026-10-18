// Everything Sprout says lives here. House style: no dashes, and no emoji in
// the text. The only emoji Sprout ever shows is the ✨ it adds for "celebrate"
// moments, like finishing a plan.

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Quiet study tips Sprout offers when nothing else is going on.
export const IDLE_TIPS = [
  "Stuck on something? Try reading it out loud. It slows your brain down just enough to catch what you skipped.",
  "Break it into one small step. You don't have to see the whole thing yet, just the next little piece.",
  "Took a break? That's not falling behind, that's how focus works. Brains need a breather to hold on to stuff.",
  "If your eyes are moving but nothing's landing, try the Simplify slider. Same ideas, fewer words in the way.",
  "Not sure where to start? Pick literally anything. Momentum comes after you begin, not before.",
  "Try explaining this part to me like I'm a very small bear. If you can teach it, you've got it.",
  "Phone face down for a bit? Even ten minutes without it makes a bigger difference than you'd think.",
  "Read the headings first. Knowing where a page is going makes the middle way easier to follow.",
  "If a sentence feels like a wall, find the verb. That's usually where the actual point is hiding.",
  "Write down one question you still have. Questions are a great sign you're really thinking about it.",
  "Feeling foggy? A glass of water and a quick stretch can clear more than you'd expect.",
  "You don't have to love this subject. You just have to give it the next fifteen minutes.",
  "Reread the last paragraph you understood, then keep going from there. It's a nice soft restart.",
  "Close the tabs you aren't using. Fewer things on screen means fewer things pulling at you.",
];

// Things Sprout says when you click it. Dealt from a shuffled deck so every
// click is different.
export const CLICK_MESSAGES = [
  "Hi! I'm rooting for you, always. Even on the days it feels slow.",
  "You're doing great. Honestly, way better than you're giving yourself credit for.",
  "One small step at a time. Big things are just a bunch of small things stacked up.",
  "Sip of water? Your brain is mostly water, so it's basically studying.",
  "Proud of you for showing up today. That's genuinely the hardest part.",
  "Deep breath in, slow breath out. You've got this, I promise.",
  "Tiny progress is still progress. A page is a page!",
  "Stretch break? Roll those shoulders. I'll wait right here.",
  "Hehe, that tickles! Okay okay, back to work now.",
  "Let's grow together. You learn stuff, I grow leaves. Fair trade.",
  "Focus mode: activated. I'll keep watch while you work.",
  "You're smarter than you think. Seriously, the fact that you're trying says a lot.",
  "Done is better than perfect. Get it down first, make it pretty later.",
  "I believe in you! I'm a bear with a plant on my head and even I can tell.",
  "Keep going, you're closer than it feels right now.",
  "Fun fact: bears nap a lot and they turn out fine. Breaks are allowed.",
  "Whatever you finish today counts. Nobody's grading the effort but you.",
  "You've already done harder things than this. This one's got nothing on you.",
  "If it's not clicking yet, that's okay. Confusion is just learning that hasn't finished loading.",
  "Snack check! Hungry brains get grumpy. Mine does, anyway.",
  "I like hanging out with you while you study. It's very cozy over here.",
  "Little reminder: you're allowed to ask for help. That's what smart people do.",
];

// Camera focus check ins.
export const NUDGE_MESSAGES = [
  "Hey, I'm here whenever you're ready to come back. No rush, I'll keep your spot warm.",
  "Wandered off for a sec? Totally normal. Come back when you're ready.",
  "Psst, your page misses you. Take a breath and we'll jump back in together.",
  "Brains drift, it happens to everyone. Want to try just one more paragraph?",
  "I noticed you stepped away. Need a real break, or a gentle push back in?",
];

export const WELCOME_BACK_MESSAGES = [
  "Welcome back! Let's pick up right where you left off.",
  "There you are! I saved your place, let's keep rolling.",
  "Hey, you came back. That's the part that matters most.",
  "Back in action! Let's ease in with the next small bit.",
  "Good to see you again. Ready for a few more minutes of focus?",
];

// A document finished loading.
export const EXTENSION_READY_MESSAGES = [
  "Nice, I grabbed that from Canvas for you! Ready whenever you are.",
  "Got it straight from Canvas. Everything's loaded up and waiting for you.",
  "Pulled that in for you. Let's take a look together, one piece at a time.",
];

export const UPLOAD_READY_MESSAGES = [
  "Got it, let's break this down into pieces that actually make sense.",
  "All loaded! Take a quick look around, then we'll figure out where to start.",
  "Okay, I've got your document. Let's make it feel a lot less scary.",
  "Ready to go! Want a summary first, or should we dive right in?",
];

export const PLAN_DONE_MESSAGES = [
  "You finished your plan! That's the whole thing done. Go do something nice for yourself.",
  "Every step checked off! You actually did it. I'm so proud of you.",
  "Plan complete! Remember this feeling next time starting feels hard.",
  "That's everything! Take a real break, you more than earned it.",
];

export const PLAN_SAVED_MESSAGES = [
  "Plan saved! You'll find it under Plans whenever you want to come back to it.",
  "Got it, that plan is tucked away under Plans for later.",
  "Saved! Future you is going to be really glad you did that.",
];

// The study game, every third correct answer in a row.
export function streakMessage(count) {
  return pick([
    `${count} in a row! You're on fire right now.`,
    `${count} in a row! Look at you go.`,
    `That's ${count} straight. Your brain is really warmed up now.`,
    `${count} correct in a row! Keep that streak alive.`,
  ]);
}

// Said when the camera starts watching. Looking away gets the full popup.
export const CAMERA_ON_MESSAGES = [
  "Camera's on! I'll keep an eye out so you don't have to.",
  "Okay, I'm watching your back. Just focus on the page.",
];

const greetTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

// Sprout's hello once a calendar is connected: when you came online, and what
// you're probably meant to be doing (an event on now, one coming up, or the
// next thing due).
export function calendarGreeting({ now, current, next, due }) {
  const hello = `Hi! You came online at ${greetTime.format(now)}.`;
  if (current) return `${hello} Right on time, it's time for "${current.title}".`;
  if (next) return `${hello} "${next.title}" starts at ${greetTime.format(next.start)}. Want a head start?`;
  if (due) return `${hello} I already know what's next: "${due.title}" is due ${due.when}. Let's chip away at it.`;
  return `${hello} Your calendar's clear, so this is a great time to study.`;
}
