import React from 'react';
import { EntityType } from '../types';
import { UNIT_INFO } from '../constants';
import { UnitPortrait } from './UnitPortrait';

interface Props {
  type: EntityType;
  onClose: () => void;
}

export const UnitDiscoveryModal: React.FC<Props> = ({ type, onClose }) => {
  const info = UNIT_INFO[type];
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="glass-panel animate-bounce-in relative w-full max-w-3xl rounded-[30px] border border-rose-400/30 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-[0.35em] text-rose-300">New Threat Detected</h2>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{info.name}</h1>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="shrink-0 self-center">
            <UnitPortrait type={type} size={200} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded border border-slate-700 bg-slate-800 p-4">
              <div className="mb-1 text-sm font-bold uppercase text-blue-400">Classification</div>
              <div className="text-xl text-white">{info.role}</div>
            </div>

            <div>
              <div className="mb-4 text-lg leading-relaxed text-gray-300">{info.description}</div>
              <div className="border-l-4 border-slate-600 pl-4 italic text-slate-500">
                "{info.flavor}"
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
            className="arcade-button rounded-full border border-rose-300/20 bg-rose-600 px-10 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
