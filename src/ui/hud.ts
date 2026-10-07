import { ANIM } from '../config';
import { easeOutCubic, type Animator, type TweenHandle } from '../render/animator';

/** Score readout, clear/combo popups and the game-over panel. */
export class Hud {
  /** Score panel; its bounds tell the camera what space to keep clear. */
  readonly scoreEl: HTMLElement;
  private readonly scoreValue: HTMLElement;
  private readonly popups: HTMLElement;
  private readonly gameOver: HTMLElement;
  private readonly finalScore: HTMLElement;
  private readonly bestValue: HTMLElement;
  private readonly newBest: HTMLElement;
  private shown = 0;
  private tween?: TweenHandle;

  constructor(
    private readonly animator: Animator,
    onRestart: () => void,
  ) {
    const score = (this.scoreEl = el('div', 'hud-score'));
    score.append(
      el('span', 'hud-label', 'Score'),
      (this.scoreValue = el('span', 'hud-value', '0')),
      (this.bestValue = el('span', 'hud-best')),
    );
    this.popups = el('div', 'hud-popups');

    this.gameOver = el('div', 'game-over');
    this.gameOver.hidden = true;
    this.gameOver.setAttribute('role', 'dialog');
    this.gameOver.setAttribute('aria-labelledby', 'game-over-title');
    const card = el('div', 'game-over-card');
    const title = el('h2', '', 'No moves left');
    title.id = 'game-over-title';
    const again = el('button', 'game-over-button', 'Play again') as HTMLButtonElement;
    again.type = 'button';
    again.addEventListener('click', onRestart);
    card.append(
      title,
      el('p', 'game-over-label', 'Final score'),
      (this.finalScore = el('p', 'game-over-score')),
      (this.newBest = el('p', 'game-over-best', 'New best!')),
      again,
    );
    this.gameOver.appendChild(card);

    document.body.append(score, this.popups, this.gameOver);
  }

  /** Update the score readout, counting up unless `animate` is false. */
  setScore(score: number, animate = true): void {
    this.tween?.cancel();
    if (!animate || score <= this.shown) {
      this.shown = score;
      this.scoreValue.textContent = String(score);
      return;
    }
    this.tween = this.animator.tween({
      from: this.shown,
      to: score,
      duration: ANIM.scoreCountMs,
      ease: easeOutCubic,
      onUpdate: (v) => {
        this.shown = Math.round(v);
        this.scoreValue.textContent = String(this.shown);
      },
    });
  }

  /** Floating text that rises and fades (CSS animation), e.g. "+120" / "Combo ×2". */
  popup(points: string, label: string): void {
    const item = el('div', 'hud-popup');
    item.append(el('span', 'hud-popup-points', points), el('span', 'hud-popup-label', label));
    item.addEventListener('animationend', () => item.remove());
    this.popups.appendChild(item);
  }

  setBest(best: number): void {
    this.bestValue.textContent = best > 0 ? `Best ${best}` : '';
  }

  showGameOver(score: number, isNewBest: boolean): void {
    this.finalScore.textContent = String(score);
    this.newBest.hidden = !isNewBest;
    this.gameOver.hidden = false;
    this.gameOver.querySelector('button')?.focus();
  }

  hideGameOver(): void {
    this.gameOver.hidden = true;
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
