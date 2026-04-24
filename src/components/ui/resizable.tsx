import * as React from 'react';
import {GripVertical} from 'lucide-react';
import {
    Group,
    Panel,
    type PanelProps,
    Separator,
    type GroupProps,
    type SeparatorProps,
} from 'react-resizable-panels';
import {cn} from '@/lib/utils.ts';

const ResizablePanelGroup = React.forwardRef<
    HTMLDivElement,
    GroupProps
>(({className, ...props}, ref) => (
    <Group
        elementRef={ref}
        className={cn(
            'flex h-full w-full data-[orientation=vertical]:flex-col',
            className,
        )}
        {...props}
    />
));
ResizablePanelGroup.displayName = 'ResizablePanelGroup';

const ResizablePanel = React.forwardRef<
    HTMLDivElement,
    PanelProps
>(({className, ...props}, ref) => (
    <Panel
        elementRef={ref}
        className={cn('min-w-0 min-h-0', className)}
        {...props}
    />
));
ResizablePanel.displayName = 'ResizablePanel';

const ResizableHandle = React.forwardRef<
    HTMLDivElement,
    SeparatorProps & {withHandle?: boolean}
>(({className, withHandle, ...props}, ref) => (
    <Separator
        elementRef={ref}
        className={cn(
            'relative flex w-2 items-center justify-center bg-stone-900/80 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-stone-700 hover:bg-stone-800/90 focus-visible:outline-none focus-visible:ring-0 data-[orientation=vertical]:h-2 data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:top-1/2 data-[orientation=vertical]:after:h-px data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0',
            className,
        )}
        {...props}
    >
        {withHandle ? (
            <div className="z-10 rounded-sm border border-stone-700 bg-stone-800 p-1 text-stone-300 shadow-sm">
                <GripVertical className="size-3.5" />
            </div>
        ) : null}
    </Separator>
));
ResizableHandle.displayName = 'ResizableHandle';

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
