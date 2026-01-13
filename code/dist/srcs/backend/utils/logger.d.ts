export declare const Logger: {
    info: (...args: any[]) => void;
    success: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    server: (message: string) => void;
    route: (method: string, path: string) => void;
};
export declare function showLog(): false | {
    level: string;
    transport: {
        target: string;
        options: {
            colorize: boolean;
        };
    };
};
//# sourceMappingURL=logger.d.ts.map