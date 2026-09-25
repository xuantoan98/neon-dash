export function registerModelContextTools(game) {
  const modelContext = document.modelContext;
  if (!modelContext?.registerTool) return;

  const lifecycle = new AbortController();
  const commonOptions = { signal: lifecycle.signal };

  Promise.resolve(modelContext.registerTool({
    name: 'start_neon_dash_run',
    title: 'Bắt đầu lượt chạy',
    description: 'Bắt đầu hoặc khởi động lại một lượt chơi Neon Dash và cập nhật trạng thái game đang hiển thị.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute() {
      game.startRun();
      return game.getStatus();
    },
  }, commonOptions)).catch(() => {});

  Promise.resolve(modelContext.registerTool({
    name: 'read_neon_dash_status',
    title: 'Xem trạng thái lượt chạy',
    description: 'Đọc trạng thái, điểm và kỷ lục hiện tại của Neon Dash mà không thay đổi game.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      return game.getStatus();
    },
  }, commonOptions)).catch(() => {});
}
