// @flow
// $FlowFixMe
import React, { useRef, useEffect } from 'react';
import x3dom from 'x3dom.js';
import 'x3dom/x3dom.css';

import { makeStyles } from 'styles';

// Disable double-clicking to change rotation point
if (x3dom.Viewarea) {
  x3dom.Viewarea.prototype.onDoubleClick = () => {};
}

const styles = makeStyles({
  x3dScene: {
    border: 'none',
    height: '100%',
    width: '100%',
  },
});

interface Props {
  label: string;
  children: React$Node;
}

export default function X3dScene({ label, children }: Props) {
  const x3d = useRef(null);

  useEffect(() => {
    // Reload X3DOM asynchronously so that it tracks the re-created instance
    setTimeout(() => {
      x3dom.reload();
      // X3DOM generates this canvas which isn't controlled by react,
      // so we have to manually fix things
      const canvas = x3d.current.querySelector('canvas');
      canvas.setAttribute('tabIndex', -1);
      canvas.setAttribute('aria-label', label);
    });
  }, []);

  return (
    <x3d is="x3d" class={styles('x3dScene')} ref={x3d}>
      <scene is="x3d">
        <viewpoint is="x3d" position="0,0,5" />
        {children}
      </scene>
    </x3d>
  );
}
