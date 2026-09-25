import { bindControls } from './controls.js';
import { NeonDashGame } from './game.js';
import { registerModelContextTools } from './model-context.js';
import { GameUI } from './ui.js';

const canvas = document.getElementById('game');
const ui = new GameUI();
const game = new NeonDashGame(canvas, ui);

bindControls(game);
registerModelContextTools(game);
game.start();
