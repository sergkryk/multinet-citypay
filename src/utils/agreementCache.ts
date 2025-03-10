import { SoapAgreement } from "../infrastructure/soap/types";

// cache.ts
export class AgreementCache {
    private static cache: Map<number, {agreement: SoapAgreement, timestamp: number}> = new Map();
    private static readonly CACHE_MAX_SIZE = 200;
    
    private constructor() {}
    
    public static get(userId: number): SoapAgreement | null {
      const cachedEntry = this.cache.get(userId);
      const now = Date.now();
      const CACHE_TTL = 30 * 60 * 1000;
      
      if (cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL)) {
        return cachedEntry.agreement;
      }
      
      return null;
    }
    
    public static set(userId: number, agreement: SoapAgreement): void {
      this.cache.set(userId, {
        agreement,
        timestamp: Date.now()
      });
      
      if (this.cache.size > this.CACHE_MAX_SIZE) {
        this.trim();
      }
    }
    
    private static trim(): void {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const entriesToRemove = entries.slice(0, entries.length - this.CACHE_MAX_SIZE);
        for (const [userId] of entriesToRemove) {
          this.cache.delete(userId);
        }
      }
    
    public static invalidate(userId: number): void {
      this.cache.delete(userId);
    }
  }
  