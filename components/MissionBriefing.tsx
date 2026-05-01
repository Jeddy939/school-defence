import React from 'react';

interface Props {
  isTouchMode?: boolean;
  onClose: () => void;
  onCenterView: () => void;
}

const briefingCards = [
  {
    title: 'Open Strong',
    body: 'Select the Teacher\'s Aide, right click bookshelves and admin to start the economy, then queue more staff before the first wave lands.'
  },
  {
    title: 'Shape The Oval',
    body: 'Use lockers to funnel students and place your early departments where ranged units can fire into the chokepoints.'
  },
  {
    title: 'Demo Route',
    body: 'For a class or trailer run: gather, place one defensive line, recruit a unit, then let the first wave crash into your setup.'
  }
];

const touchBriefingCards = [
  {
    title: 'Open Strong',
    body: 'Tap the Teacher\'s Aide to select them, then double tap bookshelves and admin to start the economy before the first wave lands.'
  },
  {
    title: 'Shape The Oval',
    body: 'Tap build commands from the card, then tap the schoolyard to place structures. Drag the field to pan around tight mobile screens.'
  },
  {
    title: 'Command Clearly',
    body: 'Keep a unit selected and double tap the ground to move, or double tap students and resources to issue orders.'
  }
];

export const MissionBriefing: React.FC<Props> = ({ isTouchMode = false, onClose, onCenterView }) => {
  const cards = isTouchMode ? touchBriefingCards : briefingCards;
  const badges = isTouchMode
    ? ['Tap Select', 'Double Tap Command', 'Drag Pan', 'Pinch Zoom', 'Center Button']
    : ['Left Click Select', 'Right Click Command', 'Middle Mouse Pan', 'Mouse Wheel Zoom', 'C Recenter Camera'];

  return (
    <div className="mission-briefing-backdrop">
      <div className="mission-briefing-panel glass-panel animate-bounce-in w-full max-w-4xl rounded-[32px] border border-sky-300/20 shadow-2xl">
        <div className="mission-briefing-content p-5 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">Mission Briefing</div>
            <h2 className="mt-2 font-display text-3xl uppercase leading-none text-white sm:text-4xl">
              First 30 Seconds
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {isTouchMode
                ? 'Mobile controls are tuned for quick RTS play: select with a tap, command with a double tap, and keep the playfield visible while the HUD handles unit details.'
                : 'This build is tuned to look good fast in a demo: establish income, shape one defensive lane, and let the player or audience see the schoolyard chaos escalate clearly.'}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Protect the staffroom. Build the story beat before the first wave.
          </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="rounded-[24px] border border-white/8 bg-slate-950/45 p-4">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-sky-200">{card.title}</div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.body}</p>
            </div>
          ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
          {badges.map((badge) => (
            <span key={badge} className="ink-badge">{badge}</span>
          ))}
          </div>
        </div>

        <div className="mission-briefing-actions flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCenterView}
            className="arcade-button rounded-2xl border border-white/10 bg-slate-700 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-100 transition hover:-translate-y-0.5 hover:bg-slate-600"
          >
            Center On Staffroom
          </button>
          <button
            onClick={onClose}
            className="arcade-button rounded-2xl border border-sky-300/20 bg-sky-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-sky-500"
          >
            Start Duty
          </button>
        </div>
      </div>
    </div>
  );
};
