/**
 * Error handler for consistent error reporting
 */
export class ErrorBoundary {
 private static instance: ErrorBoundary;
 
 static getInstance(): ErrorBoundary {
 if (!ErrorBoundary.instance) {
 ErrorBoundary.instance = new ErrorBoundary();
 }
 return ErrorBoundary.instance;
 }
 
 handleError(error: Error, context: string): void {
 console.error(`[CourseBuilder/${context}] Error:`, error);
 // Could integrate with error reporting service here
 }
}
