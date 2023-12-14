<script lang='ts'>
    import {onDestroy, onMount} from 'svelte';
    interface SimpleRect {
        width: number;
        left: number;
        right: number;
    }
    interface ResizableHTMLDivElement extends HTMLDivElement {
        side?: 'left' | 'right';
    }

    let activeDiv: HTMLDivElement;
    let initialPosition = { x: 0, y: 0 };
    let initialWidth: SimpleRect = { width: 0, left: 0, right: 0 };
    let resizeRight: ResizableHTMLDivElement;
    let resizeLeft: ResizableHTMLDivElement;
    let activeResizeDiv: ResizableHTMLDivElement;
    // let element: HTMLElement;

    onMount(() => {
        resizeRight = document.getElementById('right') as ResizableHTMLDivElement;
        resizeLeft = document.getElementById('left') as ResizableHTMLDivElement;
    })
    
    onDestroy(() => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    });
    
    // function move(element: HTMLElement): void {
    //
    //
    // }
    //
    // function resize(element: HTMLElement): void {
    //     element = element;
    //
    //     resizeRight = ;
    //     resizeRight.side = 'right';
    //     resizeRight.classList.add('resize', 'right');
    //     resizeRight.addEventListener('mousedown', onMouseDown);
    //     element.appendChild(resizeRight);
    //
    //     resizeLeft = document.createElement('div');
    //     resizeLeft.side = 'left';
    //     resizeLeft.classList.add('resize', 'left');
    //     resizeLeft.addEventListener('mousedown', onMouseDown);
    //     element.appendChild(resizeLeft);
    // }

    function onMouseDown(event: MouseEvent): void {
        activeResizeDiv = event.target as ResizableHTMLDivElement;
        if (!activeResizeDiv) return;

        console.log(activeResizeDiv.parentElement?.getBoundingClientRect())
        console.log(activeResizeDiv.getBoundingClientRect())

        const parent = activeResizeDiv.parentElement?.getBoundingClientRect() || new DOMRect(0, 0, 0, 0);
        const child = activeResizeDiv.getBoundingClientRect();
        initialPosition = { x: event.pageX, y: event.pageY };
        initialWidth = {
            width: child.width,
            left: child.left - parent.left,
            right: parent.right - child.right
        }

        // const rect = element.getBoundingClientRect();
        // const parent = element.parentElement?.getBoundingClientRect() || new DOMRect(0, 0, 0, 0)
        // initialPosition = { x: event.pageX, y: event.pageY };
        // initialWidth = {
        //     width: rect.width,
        //     left: rect.left - parent.left,
        //     right: parent.right - rect.right
        // }
    }

    function onMouseMove(event: MouseEvent): void {}

    function onMouseUp(event: MouseEvent): void {
        if (!activeResizeDiv) return;
        activeResizeDiv = null;
        initialPosition
    }
</script>

<div class='resizable-container'>
    <div
        id="left"
        class="drag"
        on:mouseup={onMouseUp}
        on:mousedown={onMouseDown}
        on:mousemove={onMouseMove}
    />
    <div class="content">
        <slot></slot>
    </div>
    <div
        id="right"
        class="drag"
        on:mouseup={onMouseUp}
        on:mousedown={onMouseDown}
        on:mousemove={onMouseMove}
    />
</div>

<style lang='scss'>
    .resizable-container {
      display: flex;
      flex-direction: row;
    }

    .drag {
      cursor: col-resize;
      width: 10px;
      height: 100%;
      top: 0;
      border: 1px solid crimson;
    }
</style>
