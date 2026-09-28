import { createSettingsPreview } from './settings-preview.js';

export function bindSettings({ game, preferences, audio }) {
  const dialog = document.getElementById('settings');
  const open = document.getElementById('settingsBtn');
  const close = document.getElementById('closeSettings');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const preview = createSettingsPreview({ dialog, preferences });
  const fields = {
    sound: document.getElementById('soundSetting'),
    volume: document.getElementById('volumeSetting'),
    motion: document.getElementById('motionSetting'),
    quality: document.getElementById('qualitySetting'),
    skin: document.getElementById('skinSetting'),
    scene: document.getElementById('sceneSetting'),
  };
  const unsubscribe = preferences.subscribe((value) => {
    fields.sound.checked = value.sound;
    fields.volume.value = value.volume;
    fields.motion.value = value.motion;
    fields.quality.value = value.quality;
    fields.skin.value = value.skin;
    fields.scene.value = value.scene;
    document.getElementById('volumeValue').textContent = `${Math.round(value.volume * 100)}%`;
  });
  open.addEventListener(
    'click',
    () => {
      game.pause();
      dialog.showModal();
      preview.refresh();
    },
    options,
  );
  close.addEventListener('click', () => dialog.close(), options);
  document.getElementById('previewSoundBtn').addEventListener(
    'click',
    () => {
      audio.unlock();
      audio.play('orb');
    },
    options,
  );
  dialog.addEventListener(
    'click',
    (event) => {
      if (event.target === dialog) dialog.close();
    },
    options,
  );
  for (const [key, element] of Object.entries(fields)) {
    element.addEventListener(
      'input',
      () => {
        const value =
          key === 'sound'
            ? element.checked
            : key === 'volume'
              ? Number(element.value)
              : element.value;
        preferences.update({ [key]: value });
        if (key === 'sound' || key === 'volume') {
          audio.unlock();
          audio.play('orb');
        }
      },
      options,
    );
  }
  return () => {
    controller.abort();
    unsubscribe();
    preview.dispose();
    if (dialog.open) dialog.close();
  };
}
