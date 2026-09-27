import React from "react";

// Small, static FADS robot mascot — reused from the loader artwork.
// No distracting animations; calm and friendly. Use as a visual guide
// where help is genuinely useful.
export default function FadsRobot({ className = "" }) {
  return (
    <div className={`fads-mascot ${className}`} aria-hidden="true">
      <div className="fads-mascot-antenna" />
      <div className="fads-mascot-head">
        <span className="fads-mascot-eye fads-mascot-eye-left" />
        <span className="fads-mascot-eye fads-mascot-eye-right" />
        <span className="fads-mascot-smile" />
      </div>
      <div className="fads-mascot-body">F</div>
      <style>{`
        .fads-mascot { display: flex; flex-direction: column; align-items: center; }
        .fads-mascot-antenna {
          position: relative;
          width: 3px;
          height: 12px;
          margin: 0 auto;
          border-radius: 999px;
          background: #42e8f5;
          box-shadow: 0 0 8px rgba(66, 232, 245, .7);
        }
        .fads-mascot-antenna::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -3px;
          width: 6px;
          height: 6px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #6ff0ff;
          box-shadow: 0 0 8px rgba(111, 240, 255, .8);
        }
        .fads-mascot-head {
          position: relative;
          width: 48px;
          height: 36px;
          border: 3px solid #1a8a8e;
          border-radius: 16px;
          background: linear-gradient(145deg, #071116, #142b34);
          box-shadow: 0 0 12px rgba(0, 220, 255, .25);
        }
        .fads-mascot-eye {
          position: absolute;
          top: 13px;
          width: 6px;
          height: 4px;
          border-radius: 999px;
          background: #4aeaff;
          box-shadow: 0 0 6px #38e6ff;
        }
        .fads-mascot-eye-left { left: 12px; }
        .fads-mascot-eye-right { right: 12px; }
        .fads-mascot-smile {
          position: absolute;
          left: 50%;
          bottom: 8px;
          width: 12px;
          height: 5px;
          transform: translateX(-50%);
          border-bottom: 2px solid #4aeaff;
          border-radius: 0 0 12px 12px;
        }
        .fads-mascot-body {
          width: 34px;
          height: 28px;
          margin: -1px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px 7px 11px 11px;
          background: linear-gradient(145deg, #071116, #142b34);
          color: #4aeaff;
          font-size: 14px;
          font-weight: 900;
          font-style: italic;
          border: 2px solid #1a8a8e;
          box-shadow: 0 4px 8px rgba(0, 0, 0, .3), 0 0 8px rgba(66, 232, 245, .15);
        }
      `}</style>
    </div>
  );
}