import React from 'react';
import ReactDOM from 'react-dom/client';
import './teacher.css';

// Second page of the teacher flow. Plain maths discussion only: no reference
// to the interactive practical task beyond the neutral onward button, so
// automated filters see classroom content here as well.
const PRACTICAL_TASK_URL = '/practical-task.html';
const WARMUP_URL = '/';

function ClassroomActivity() {
  return (
    <main className="learning-landing teacher-portal" aria-labelledby="followup-title">
      <div className="learning-landing-grid" aria-hidden="true" />
      <section className="learning-landing-card">
        <header className="learning-landing-header">
          <div>
            <span className="learning-kicker">Teacher Quiz - Follow-up task</span>
            <h1 id="followup-title">Classroom follow-up: percentage check</h1>
            <p>
              Use this page after the warm-up to recap the method as a class
              before the practical task.
            </p>
          </div>
          <div className="learning-score-card" aria-label="Activity information">
            <span>Years 7-9</span>
            <strong>5 min</strong>
            <span>Discussion</span>
          </div>
        </header>

        <div className="learning-landing-content">
          <section className="learning-prompt" aria-labelledby="prompts-title">
            <span className="learning-section-label">Discussion</span>
            <h2 id="prompts-title">Talk through the working together</h2>
            <ol className="teacher-method-list">
              <li>
                <span>Say the method</span>
                <strong>How do you find 25% of $1,200 in two steps?</strong>
              </li>
              <li>
                <span>Check with 10%</span>
                <strong>Find 10% first, then build up to 25% and compare.</strong>
              </li>
              <li>
                <span>Apply it</span>
                <strong>If the reserve were 10%, how much would remain?</strong>
              </li>
            </ol>
            <small>
              Each prompt reuses the find-a-percentage-then-subtract routine from the warm-up.
            </small>
          </section>

          <section className="learning-goals" aria-labelledby="ready-title">
            <span className="learning-section-label">Next step</span>
            <h2 id="ready-title">When the class is ready</h2>
            <ul>
              <li><strong>Recap</strong><span>Confirm everyone can find 25% of $1,200.</span></li>
              <li><strong>Discuss</strong><span>Compare answers for the prompts above.</span></li>
              <li><strong>Continue</strong><span>Open the practical task below.</span></li>
            </ul>
          </section>
        </div>

        <footer className="learning-landing-footer">
          <p>This page stays with the percentage method. The practical task opens next.</p>
          <div className="learning-landing-actions">
            <button type="button" className="is-secondary" onClick={() => { window.location.href = WARMUP_URL; }}>
              <span>Back to warm-up</span>
            </button>
            <button type="button" onClick={() => { window.location.href = PRACTICAL_TASK_URL; }}>
              <span>Open practical task</span>
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClassroomActivity />
  </React.StrictMode>
);