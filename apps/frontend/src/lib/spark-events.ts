type SparkCallback = (balance: number) => void;

class SparkDispatcher {
  private listeners: Set<SparkCallback> = new Set();
  private currentBalance: number = 0;

  subscribe(cb: SparkCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify(balance: number) {
    this.currentBalance = balance;
    this.listeners.forEach((cb) => cb(balance));
  }

  getRecentBalance() {
    return this.currentBalance;
  }
}

export const sparkDispatcher = new SparkDispatcher();
