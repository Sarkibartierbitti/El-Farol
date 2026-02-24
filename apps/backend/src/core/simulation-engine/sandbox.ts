import { AgentContext } from '@el-farol/shared';
import { VM } from 'vm2';

//validate agent code
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

//safely execute agent code
export class AgentSandbox {
  private readonly timeout: number;

  constructor(timeout: number = 100, _memoryLimit: number = 10 * 1024 * 1024) {
    this.timeout = timeout;
  }

//validate syntax and structure
  validateCode(code: string): ValidationResult {
    try {
      // basic syntax
      new Function(code);
      
      // dangerous patterns
      const dangerousPatterns = [
        /require\s*\(/,
        /import\s+/,
        /process\./,
        /global\./,
        /__dirname/,
        /__filename/,
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout/,
        /setInterval/,
        /fs\./,
        /child_process/,
        /exec\s*\(/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return {
            valid: false,
            error: `Code contains forbidden pattern: ${pattern.toString()}`
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  //execute code in safe env
  executeCode(context: AgentContext): (code: string) => boolean {
    return (code: string): boolean => {
      const vm = new VM({
        timeout: this.timeout,
        sandbox: {
          history: context.attendanceHistory,
          capacity: context.capacity,
          roundNumber: context.roundNumber,
          helpers: context.helpers ?? {
            sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
            average: (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
            min: (arr: number[]) => Math.min(...arr),
            max: (arr: number[]) => Math.max(...arr),
            last: <T>(arr: T[]) => arr[arr.length - 1]
          },
          Math,
          Array,
          Number,
          Boolean
        }
      });

      try {
        // wrap code in a function that returns a boolean
        const wrappedCode = `
          (function() {
            ${code}
            if (typeof decision !== 'undefined') {
              return Boolean(decision);
            }
            return Boolean(${code});
          })()
        `;

        const result = vm.run(wrappedCode);
        return Boolean(result);
      } catch (error) {
        throw new Error(
          `Agent code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    };
  }

//create self exectuion function
  createExecutor(context: AgentContext): (code: string) => boolean {
    const executor = this.executeCode(context);
    
    return (code: string): boolean => {

      const validation = this.validateCode(code);
      if (!validation.valid) {
        throw new Error(`Invalid agent code: ${validation.error}`);
      }

      return executor(code);
    };
  }
}

export const defaultSandbox = new AgentSandbox();

