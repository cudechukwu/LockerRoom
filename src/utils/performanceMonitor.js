/**
 * Performance monitoring utilities for measuring FPS and operation timing
 */

class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.operationTimings = new Map();
  }

  /**
   * Start monitoring FPS
   */
  startFPSMonitoring() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    
    const measureFrame = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - this.lastTime >= 1000) { // Every second
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.fpsHistory.push(fps);
        
        // Keep only last 10 measurements
        if (this.fpsHistory.length > 10) {
          this.fpsHistory.shift();
        }
        
        console.log(`📊 FPS: ${fps} (avg: ${this.getAverageFPS()})`);
        
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  /**
   * Get average FPS from recent measurements
   */
  getAverageFPS() {
    if (this.fpsHistory.length === 0) return 0;
    return Math.round(this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length);
  }

  /**
   * Start timing an operation
   */
  startTiming(operationName) {
    this.operationTimings.set(operationName, performance.now());
  }

  /**
   * End timing an operation and log the result
   */
  endTiming(operationName) {
    const startTime = this.operationTimings.get(operationName);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      this.operationTimings.delete(operationName);
      return duration;
    }
    return 0;
  }

  /**
   * Measure render performance for a component
   */
  measureRender(componentName, renderFunction) {
    this.startTiming(`${componentName}_render`);
    const result = renderFunction();
    this.endTiming(`${componentName}_render`);
    return result;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return {
      averageFPS: this.getAverageFPS(),
      fpsHistory: [...this.fpsHistory],
      isPerformanceGood: this.getAverageFPS() >= 55 // Consider 55+ FPS as good
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitoring = (componentName) => {
  const startTiming = (operationName) => {
    performanceMonitor.startTiming(`${componentName}_${operationName}`);
  };

  const endTiming = (operationName) => {
    return performanceMonitor.endTiming(`${componentName}_${operationName}`);
  };

  return { startTiming, endTiming };
};
