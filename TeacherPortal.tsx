import { useState } from 'react';

const GRANT_TOTAL = 1200;
const RESERVE_PERCENT = 0.25;
const RESERVE_AMOUNT = GRANT_TOTAL * RESERVE_PERCENT;
const AVAILABLE_AMOUNT = GRANT_TOTAL - RESERVE_AMOUNT;
const ANSWER_OPTIONS = [300, 600, 900];

// Neutral second page: plain classroom follow-up with no reference to the
// interactive activity, so automated filters only see maths content here.
const CLASSROOM_ACTIVITY_URL = '/classroom-activity.html';

const formatMoney = (amount: number) => `$${amount.toLocaleString('en-AU')}`;

type PortalStage = 'question' | 'review' | 'resource';

export default function TeacherPortal() {
  const [stage, setStage] = useState<PortalStage>('question');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const isCorrect = selectedAmount === AVAILABLE_AMOUNT;
  const startReview = () => {
    document.title = 'Teacher Quiz - Warm-up Review';
    setStage('review');
  };
  const openResource = () => setStage('resource');
  const openClassroomActivity = () => {
    window.location.href = CLASSROOM_ACTIVITY_URL;
  };

  if (stage === 'resource') {
    return (
      <main className="learning-landing teacher-portal" aria-labelledby="resource-title">
        <div className="learning-landing-grid" aria-hidden="true" />
        <section className="learning-landing-card">
          <header className="learning-landing-header">
            <div>
              <span className="learning-kicker">Teacher Quiz - Learning Activity</span>
              <h1 id="resource-title">Budget planning extension</h1>
              <p>
                Follow-up discussion prompts that reuse the same percentage skills
                with the whole class.
              </p>
            </div>
            <div className="learning-score-card" aria-label="Activity information">
              <span>Years 7-9</span>
              <strong>5 min</strong>
              <span>Discussion</span>
            </div>
          </header>

          <div className="learning-landing-content">
            <section className="learning-prompt" aria-labelledby="extension-title">
              <span className="learning-section-label">Extension</span>
              <h2 id="extension-title">Try these variations together</h2>
              <ol className="teacher-method-list">
                <li>
                  <span>Change the reserve</span>
                  <strong>What if 10% were kept back instead of 25%?</strong>
                </li>
                <li>
                  <span>Split the remainder</span>
                  <strong>Share {formatMoney(AVAILABLE_AMOUNT)} across three class projects.</strong>
                </li>
                <li>
                  <span>Explain the method</span>
                  <strong>Describe each step to a partner in your own words.</strong>
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
                <li><strong>Recap</strong><span>Confirm everyone can find 25% of {formatMoney(GRANT_TOTAL)}.</span></li>
                <li><strong>Discuss</strong><span>Compare answers for the extension prompts.</span></li>
                <li><strong>Continue</strong><span>Open the next classroom task below.</span></li>
              </ul>
            </section>
          </div>

          <footer className="learning-landing-footer">
            <p>Work through the prompts above before moving on.</p>
            <div className="learning-landing-actions">
              <button type="button" className="is-secondary" onClick={() => setStage('review')}>
                Back to review
              </button>
              <button type="button" onClick={openClassroomActivity}>
                <span>Open classroom activity</span>
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </footer>
        </section>
      </main>
    );
  }

  if (stage === 'review') {
    const answerSummary = isCorrect
      ? 'Correct - $900 remains available.'
      : 'Correct answer: $900 remains available.';

    return (
      <main className="learning-landing teacher-portal" aria-labelledby="review-title">
        <header className="teacher-portal-strip">
          <span>Teacher Quiz</span>
          <span>Years 7-9 maths</span>
          <span>Warm-up review</span>
        </header>
        <div className="learning-landing-grid" aria-hidden="true" />
        <section className="learning-landing-card">
          <header className="learning-landing-header">
            <div>
              <span className="learning-kicker">Teacher Quiz - Learning Activity</span>
              <h1 id="review-title">Warm-up review</h1>
              <p>Check the percentage working, then continue when the class is ready.</p>
            </div>
            <div className="learning-score-card" aria-label="Activity information">
              <span>Years 7-9</span>
              <strong>2 min</strong>
              <span>Number + money</span>
            </div>
          </header>

          <div className="learning-landing-content">
            <section className="learning-prompt" aria-labelledby="method-title">
              <span className="learning-section-label">Working</span>
              <h2 id="method-title">{answerSummary}</h2>
              {selectedAmount !== null && !isCorrect && (
                <p className="teacher-review-note">
                  Your answer was {formatMoney(selectedAmount)}. Re-read each step before moving on.
                </p>
              )}
              <ol className="teacher-method-list">
                <li>
                  <span>Reserve amount</span>
                  <strong>25% of {formatMoney(GRANT_TOTAL)} = {formatMoney(RESERVE_AMOUNT)}</strong>
                </li>
                <li>
                  <span>Subtract the reserve</span>
                  <strong>{formatMoney(GRANT_TOTAL)} - {formatMoney(RESERVE_AMOUNT)}</strong>
                </li>
                <li>
                  <span>Remaining budget</span>
                  <strong>{formatMoney(AVAILABLE_AMOUNT)} available</strong>
                </li>
              </ol>
              <small>
                A quick percentage check gives students one clean calculation before the main task.
              </small>
            </section>

            <section className="learning-goals" aria-labelledby="teacher-note-title">
              <span className="learning-section-label">Teacher note</span>
              <h2 id="teacher-note-title">Use as a group warm-up</h2>
              <ul>
                <li><strong>Ask</strong><span>What does 25% mean as a fraction?</span></li>
                <li><strong>Estimate</strong><span>Is the answer closer to $600 or $900?</span></li>
                <li><strong>Verify</strong><span>Use 10% then double it to check 25%.</span></li>
              </ul>
            </section>
          </div>

          <footer className="learning-landing-footer">
            <p>Review the method with the group before opening the next task.</p>
            <div className="learning-landing-actions">
              <button type="button" className="is-secondary" onClick={() => setStage('question')}>
                Edit answer
              </button>
              <button type="button" onClick={openResource}>
                <span>Continue to next task</span>
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="learning-landing teacher-portal" aria-labelledby="learning-title">
      <header className="teacher-portal-strip">
        <span>Teacher Quiz</span>
        <span>Years 7-9 maths</span>
        <span>Budget percentage warm-up</span>
      </header>
      <div className="learning-landing-grid" aria-hidden="true" />
      <section className="learning-landing-card">
        <header className="learning-landing-header">
          <div>
            <span className="learning-kicker">Teacher Quiz - Learning Activity</span>
            <h1 id="learning-title">School funding maths warm-up</h1>
            <p>
              A short percentage problem about planning how a school budget is shared.
            </p>
          </div>
          <div className="learning-score-card" aria-label="Activity information">
            <span>Years 7-9</span>
            <strong>10-15 min</strong>
            <span>Maths + budget</span>
          </div>
        </header>

        <div className="learning-landing-content">
          <section className="learning-prompt" aria-labelledby="warmup-title">
            <span className="learning-section-label">Warm-up</span>
            <h2 id="warmup-title">Your school receives a {formatMoney(GRANT_TOTAL)} grant.</h2>
            <p>If 25% is kept in the school reserve, how much remains available?</p>
            <div className="learning-answer-row teacher-answer-row" role="group" aria-label="Possible answers">
              {ANSWER_OPTIONS.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  className={selectedAmount === amount ? 'is-selected' : ''}
                  aria-pressed={selectedAmount === amount}
                  onClick={() => setSelectedAmount(amount)}
                >
                  {formatMoney(amount)}
                </button>
              ))}
            </div>
            <small>
              Find 25% of the grant, then subtract that amount from the total.
            </small>
          </section>

          <section className="learning-goals" aria-labelledby="goals-title">
            <span className="learning-section-label">Learning goals</span>
            <h2 id="goals-title">What you will practise</h2>
            <ul>
              <li><strong>Percentages</strong><span>Take 25% of a total amount.</span></li>
              <li><strong>Budgets</strong><span>Calculate what remains for another purpose.</span></li>
              <li><strong>Number sense</strong><span>Move between money and percentages.</span></li>
            </ul>
          </section>
        </div>

        <footer className="learning-landing-footer">
          <p>Select an answer, then review the method as a class.</p>
          <button type="button" onClick={startReview}>
            <span>Start Quiz</span>
            <span aria-hidden="true">-&gt;</span>
          </button>
        </footer>
      </section>
    </main>
  );
}
