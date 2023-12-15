<script lang='ts'>
    import {onDestroy} from 'svelte';

    export let disableLeftResize: boolean = false;
    export let disableRightResize: boolean = false;

    interface SimpleRect {
        width: number;
        left: number;
        right: number;
    }
    // // interface ResizableHTMLDivElement extends HTMLDivElement {
    // //     side?: 'left' | 'right';
    // // }
    //
    // let activeDiv: HTMLDivElement;
    //
    // // The initial position of the cursor when clicking the draggable surface
    // let initialPosition = { x: 0, y: 0 };
    // // The div handle element, which is the div with id set to either 'left' or 'right'
    // let activeResizeHandle: HTMLDivElement | null = null;
    //
    // let initialRect: SimpleRect = { width: 0, left: 0, right: 0 };
    //
    // onDestroy(() => {
    //     // TODO: Check if this is necessary
    //     document.removeEventListener('mousemove', onMouseMove);
    //     document.removeEventListener('mouseup', onMouseUp);
    //     document.removeEventListener('mousedown', onMouseDown);
    // });
    //
    // function onMouseDown(event: MouseEvent): void {
    //     activeResizeHandle = event.target as HTMLDivElement;
    //     if (!activeResizeHandle || activeResizeHandle.id !== 'left' && activeResizeHandle.id !== 'right') return;
    //
    //     const child = activeResizeHandle.parentElement;
    //     const parent = child.parentElement;
    //
    //     console.log('child', child)
    //     console.log('parent', parent)
    //
    //     initialPosition = { x: event.pageX, y: event.pageY };
    //     initialRect = {
    //         width: child.offsetWidth,
    //         left: child.offsetLeft,
    //         right: parent.offsetWidth - child.offsetWidth - child.offsetLeft
    //     }
    // }
    //
    // function onMouseMove(event: MouseEvent): void {
    //     console.log('onMouseMove')
    //     if (!activeResizeHandle) return;
    //     let parent = activeResizeHandle.parentElement as HTMLDivElement;
    //
    //     // console.log('event.pageX', event.pageX)
    //     // console.log('initialPosition.x', initialPosition.x)
    //     // console.log('initialRect.width', initialRect.width)
    //     // console.log('initialRect.left', initialRect.left)
    //     // console.log('initialRect.right', initialRect.right)
    //     // console.log('parent.style.width', parent.style.width)
    //
    //     let delta = 0;
    //     if (activeResizeHandle.id === 'right') {
    //         delta = event.pageX - initialPosition.x;
    //         let newWidth = initialRect.width + delta;
    //         if (newWidth > window.innerWidth) {
    //             newWidth = window.innerWidth;
    //         }
    //         parent.style.width = `${newWidth}px`;
    //     }
    //     else if (activeResizeHandle.id === 'left') {
    //         delta = initialPosition.x - event.pageX;
    //         parent.style.left = `${initialRect.left - delta}px`;
    //         parent.style.width = `${initialRect.width - delta}px`; // subtract delta from width
    //     }
    // }
    //
    // function onMouseUp(event: MouseEvent): void {
    //     if (!activeResizeHandle) return;
    //     activeResizeHandle = null;
    //     initialPosition = { x: 0, y: 0 };
    //     initialRect = { width: 0, left: 0, right: 0 };
    // }

    let activeResizer: HTMLDivElement | null = null;
    let leftResizer: HTMLDivElement | null = null;
    let rightResizer: HTMLDivElement | null = null;
    let initialPosition = { x: 0, y: 0 };
    let initialRect: SimpleRect = { width: 0, left: 0, right: 0 };

    function move(element: HTMLElement) {
        return {
            destroy() {}
        }
    }

    function resize(element: HTMLElement) {
        if (!disableLeftResize) {
            leftResizer = element.querySelector('#left');
            leftResizer?.addEventListener('mousedown', onMouseDown);
        }
        if (!disableRightResize) {
            rightResizer = element.querySelector('#right');
            rightResizer?.addEventListener('mousedown', onMouseDown);
        }

        function onMouseDown(event: MouseEvent) {
            // Set body style to no text selection
            document.body.style.userSelect = 'none';

            activeResizer = event.target as HTMLDivElement;
            if (!activeResizer || activeResizer.id !== 'left' && activeResizer.id !== 'right') return;

            const child = activeResizer.parentElement;
            if (!child) return;
            const parent = child.parentElement;
            if (!parent) return;

            console.log('child', child)
            console.log('parent', parent)

            initialPosition = { x: event.pageX, y: event.pageY };
            initialRect = {
                width: child.offsetWidth,
                left: child.offsetLeft,
                right: parent.offsetWidth - child.offsetWidth - child.offsetLeft
            }
        }

        function onMouseUp(event: MouseEvent) {
            if (!activeResizer) return;
            activeResizer = null;
            initialPosition = { x: 0, y: 0 };
            initialRect = { width: 0, left: 0, right: 0 };
        }

        function onMove(event: MouseEvent) {
            if (!activeResizer) return;
            let parent = activeResizer.parentElement as HTMLDivElement;

            let delta = 0;
            if (activeResizer.id === 'right') {
                delta = event.pageX - initialPosition.x;
                let newWidth = initialRect.width + delta;
                if (newWidth > window.innerWidth) {
                    newWidth = window.innerWidth;
                }
                parent.style.width = `${newWidth}px`;
            }
            else if (activeResizer.id === 'left') {
                delta = initialPosition.x - event.pageX;
                parent.style.left = `${initialRect.left - delta}px`;
                parent.style.width = `${initialRect.width - delta}px`; // subtract delta from width
            }
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onMouseUp);
    }
</script>

<div class='resizable-container'
     role="none"
     use:resize
     use:move
>
    {#if !disableLeftResize}
        <div id="left" class="drag"/>
    {/if}
    <slot name="content">No content provided</slot>
    {#if !disableRightResize}
        <div id="right" class="drag"/>
    {/if}
</div>

<style lang='scss'>
    .resizable-container {
      position: relative;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    .drag {
      cursor: col-resize;
      height: 100%;
      top: 0;
      border: 3px dotted crimson;
    }

    #left {
      transform: translateX(-50%);
    }

    #right {
      transform: translateX(50%);
    }
</style>
