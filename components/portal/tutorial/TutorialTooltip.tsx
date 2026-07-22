'use client';

import { useMemo } from 'react';
import { useTutorial } from './useTutorial';
import { TutorialProgress } from './TutorialProgress';
import type { TutorialStep } from './types';

interface TooltipProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: { top: number; left: number; width: number; height: number } | null;
}

const TOOLTIP_WIDTH = 340;
const TOOLTIP_GAP = 16;

export function TutorialTooltip({ step, stepIndex, totalSteps, targetRect }: TooltipProps) {
  const { next, back, skip } = useTutorial();
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const position = useMemo(() => {
    if (!targetRect) {
      // Center on screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const { top, left, width, height } = targetRect;

    switch (step.placement) {
      case 'bottom':
        return {
          top: top + height + TOOLTIP_GAP,
          left: Math.max(16, Math.min(left + width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 16)),
        };
      case 'top':
        return {
          top: top - TOOLTIP_GAP,
          left: Math.max(16, Math.min(left + width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 16)),
          transform: 'translateY(-100%)',
        };
      case 'right':
        return {
          top: top + height / 2,
          left: left + width + TOOLTIP_GAP,
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          top: top + height / 2,
          left: left - TOOLTIP_GAP,
          transform: 'translate(-100%, -50%)',
        };
      default:
        return {
          top: top + height + TOOLTIP_GAP,
          left: Math.max(16, left),
        };
    }
  }, [targetRect, step.placement]);

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-2xl p-5 pb-8 animate-slide-up"
        role="tooltip"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cranberry/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-cranberry font-bold text-sm">{stepIndex + 1}</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-900 dark:text-white text-base">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>
        <TutorialProgress current={stepIndex} total={totalSteps} />
        <div className="flex items-center gap-2 mt-4">
          {!isFirst && (
            <button
              onClick={back}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={skip}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-auto"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="px-5 py-2 text-sm font-semibold text-white bg-cranberry hover:bg-cranberry-700 rounded-lg transition-colors shadow-sm"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      {/* Desktop: positioned tooltip */}
      <div
        className="hidden lg:block fixed z-[10000] pointer-events-auto"
        style={{
          ...position,
          width: TOOLTIP_WIDTH,
        }}
        role="tooltip"
      >
        <div className="p-card dark:border-gray-700 shadow-2xl p-5 animate-scale-in">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cranberry/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-cranberry font-bold text-sm">{stepIndex + 1}</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-base leading-tight">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          <TutorialProgress current={stepIndex} total={totalSteps} />

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            {!isFirst && (
              <button
                onClick={back}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={skip}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-auto"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-cranberry hover:bg-cranberry-700 rounded-lg transition-colors shadow-sm"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
