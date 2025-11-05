const GoogleProvider = require('./GoogleProvider');
const GitHubProvider = require('./GitHubProvider');

class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.registerDefaultProviders();
  }

  registerDefaultProviders() {
    this.register('google', new GoogleProvider());
    this.register('github', new GitHubProvider());
  }

  register(name, provider) {
    this.providers.set(name.toLowerCase(), provider);
  }

  getProvider(name) {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    return provider;
  }

  getSupportedProviders() {
    return Array.from(this.providers.keys());
  }

  isProviderSupported(name) {
    return this.providers.has(name.toLowerCase());
  }
}

module.exports = new ProviderFactory();
