type AiConfig = Record<string, unknown>;

export function buildMultiClientAiConfig(config: AiConfig = {}) {
  const apiUrl = typeof config.apiUrl === 'string' ? config.apiUrl : '';
  const model = typeof config.model === 'string' ? config.model : '';
  const provider = typeof config.provider === 'string' ? config.provider : '';
  return {
    apiUrl,
    model,
    provider,
    useAI: config.useAI !== false,
  };
}
