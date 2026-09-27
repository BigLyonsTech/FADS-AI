import React from "react";

export default function FadsRobotLoader({
  message = "FADS AI IS CHECKING...",
  fullScreen = false,
  compact = false,
}) {
  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/95 backdrop-blur-sm"
          : compact
            ? "flex min-h-[150px] items-center justify-center"
            : "flex min-h-[220px] items-center justify-center"
      }
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center text-center">
        <div className={compact ? "scale-75 -my-4" : ""}>
          <div className="fads-loader-robot" aria-hidden="true">
            <div className="fads-loader-antenna" />
            <div className="fads-loader-head">
              <span className="fads-loader-eye fads-loader-eye-left" />
              <span className="fads-loader-eye fads-loader-eye-right" />
              <span className="fads-loader-smile" />
            </div>
            <div className="fads-loader-body">F</div>
          </div>
        </div>

        <div className={compact ? "mt-4 text-[9px] font-extrabold tracking-[0.22em] text-brand-teal" : "mt-7 text-[11px] font-extrabold tracking-[0.28em] text-brand-teal"}>
          {message}
        </div>

        <div className="mt-3 flex gap-2" aria-hidden="true">
          <span className="fads-loader-dot" />
          <span className="fads-loader-dot" />
          <span className="fads-loader-dot" />
        </div>
      </div>

      <style>{`
        .fads-loader-robot {
          animation: fadsRobotFloat 1.8s ease-in-out infinite;
        }

        .fads-loader-antenna {
          position: relative;
          width: 4px;
          height: 20px;
          margin: 0 auto;
          border-radius: 999px;
          background: #42e8f5;
          box-shadow: 0 0 14px rgba(66, 232, 245, .9);
        }

        .fads-loader-antenna::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -5px;
          width: 9px;
          height: 9px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #6ff0ff;
          box-shadow: 0 0 17px rgba(111, 240, 255, .95);
        }

        .fads-loader-head {
          position: relative;
          width: 106px;
          height: 78px;
          border: 4px solid #d5ecf1;
          border-radius: 34px;
          background: linear-gradient(145deg, #071116, #142b34);
          box-shadow:
            0 0 30px rgba(0, 220, 255, .38),
            inset 0 0 18px rgba(0, 220, 255, .10);
        }

        .fads-loader-eye {
          position: absolute;
          top: 28px;
          width: 13px;
          height: 8px;
          border-radius: 999px;
          background: #4aeaff;
          box-shadow: 0 0 14px #38e6ff;
          animation: fadsRobotBlink 2.4s infinite;
        }

        .fads-loader-eye-left { left: 25px; }
        .fads-loader-eye-right { right: 25px; }

        .fads-loader-smile {
          position: absolute;
          left: 50%;
          bottom: 17px;
          width: 26px;
          height: 12px;
          transform: translateX(-50%);
          border-bottom: 3px solid #4aeaff;
          border-radius: 0 0 25px 25px;
        }

        .fads-loader-body {
          width: 74px;
          height: 61px;
          margin: -2px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px 15px 24px 24px;
          background: linear-gradient(145deg, #eef8fa, #b9d4dc);
          color: #063142;
          font-size: 30px;
          font-weight: 900;
          font-style: italic;
          box-shadow: 0 12px 24px rgba(0, 0, 0, .26);
        }

        .fads-loader-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #39e7ff;
          animation: fadsRobotPulse .9s infinite alternate;
        }

        .fads-loader-dot:nth-child(2) { animation-delay: .2s; }
        .fads-loader-dot:nth-child(3) { animation-delay: .4s; }

        @keyframes fadsRobotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes fadsRobotBlink {
          0%, 44%, 48%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(.12); }
        }

        @keyframes fadsRobotPulse {
          from { opacity: .25; transform: scale(.8); }
          to { opacity: 1; transform: scale(1.25); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fads-loader-robot,
          .fads-loader-eye,
          .fads-loader-dot {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
