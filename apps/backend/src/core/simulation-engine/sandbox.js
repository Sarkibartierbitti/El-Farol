import { VM } from 'vm2';
//safely execute agent code
export class AgentSandbox {
    timeout;
    constructor(timeout = 100, _memoryLimit = 10 * 1024 * 1024) {
        this.timeout = timeout;
    }
    //validate syntax and structure
    validateCode(code) {
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
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            };
        }
    }
    //execute code in safe env
    executeCode(context) {
        return (code) => {
            const vm = new VM({
                timeout: this.timeout,
                sandbox: {
                    history: context.attendanceHistory,
                    capacity: context.capacity,
                    roundNumber: context.roundNumber,
                    helpers: context.helpers ?? {
                        sum: (arr) => arr.reduce((a, b) => a + b, 0),
                        average: (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
                        min: (arr) => Math.min(...arr),
                        max: (arr) => Math.max(...arr),
                        last: (arr) => arr[arr.length - 1]
                    },
                    Math,
                    Array,
                    Number,
                    Boolean
                }
            });
            try {
                const statementWrapper = `
          (function() {
            ${code}
            if (typeof decision !== 'undefined') {
              return Boolean(decision);
            }
            return undefined;
          })()
        `;
                const statementResult = vm.run(statementWrapper);
                if (typeof statementResult !== 'undefined') {
                    return Boolean(statementResult);
                }
                const expressionWrapper = `Boolean(${code})`;
                const expressionResult = vm.run(expressionWrapper);
                return Boolean(expressionResult);
            }
            catch (error) {
                throw new Error(`Agent code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
    }
    //create self exectuion function
    createExecutor(context) {
        const executor = this.executeCode(context);
        return (code) => {
            const validation = this.validateCode(code);
            if (!validation.valid) {
                throw new Error(`Invalid agent code: ${validation.error}`);
            }
            return executor(code);
        };
    }
}
export const defaultSandbox = new AgentSandbox();
