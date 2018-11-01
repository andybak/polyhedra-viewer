// @flow strict
// $FlowFixMe
import _ from 'lodash';
// $FlowFixMe
import React, { useRef, useEffect, useContext } from 'react';
import { createModel } from 'components/common';

import Config from 'components/ConfigModel';
import PolyhedronModel from './PolyhedronModel';
import transition from 'transition';
import { Polyhedron } from 'math/polyhedra';
import { PRECISION } from 'math/geom';

function getCoplanarFaces(polyhedron) {
  const found = [];
  const pairs = [];
  _.forEach(polyhedron.faces, f1 => {
    if (f1.inSet(found) || !f1.isValid()) return;

    _.forEach(f1.adjacentFaces(), f2 => {
      if (!f2 || !f2.isValid()) return;
      if (f1.normal().equalsWithTolerance(f2.normal(), PRECISION)) {
        pairs.push([f1, f2]);
        found.push(f1);
        found.push(f2);
        return;
      }
    });
  });
  return pairs;
}

function getFaceColors(polyhedron, colors) {
  const pairs = getCoplanarFaces(polyhedron);
  const mapping = {};
  _.forEach(pairs, ([f1, f2]) => {
    const numSides = f1.numSides + f2.numSides - 2;
    mapping[f1.index] = numSides;
    mapping[f2.index] = numSides;
  });

  return polyhedron.faces.map(
    face =>
      colors[_.get(mapping, face.index.toString(), face.numUniqueSides())],
  );
}

function arrayDefaults(first, second) {
  return _.map(first, (item, i) => (_.isNil(item) ? second[i] : item));
}

const defaultState = {
  solidData: null,
  faceColors: null,
  isTransitioning: false,
};
const InterpModel = createModel(
  {
    reset: () => () => defaultState,
    set: (solidData, faceColors) => () => ({
      solidData,
      faceColors,
      isTransitioning: !!solidData,
    }),
  },
  defaultState,
);

const TransitionContext = React.createContext(_.noop);

function Provider({ children }: *) {
  const transitionId = useRef(null);
  const { setPolyhedron } = PolyhedronModel.useActions();
  const { colors, animationSpeed, enableAnimation } = Config.useState();
  const anim = InterpModel.useActions();

  // Cancel the animation if the component we're a part of gets rerendered.
  useEffect(
    () => {
      return () => {
        if (transitionId.current) {
          transitionId.current.cancel();
        }
      };
    },
    [transitionId],
  );
  const transitionFn = (result: Polyhedron, animationData: *) => {
    if (!enableAnimation || !animationData) {
      setPolyhedron(result);
      anim.reset();
      return;
    }

    const { start, endVertices } = animationData;
    const colorStart = getFaceColors(start, colors);
    const colorEnd = getFaceColors(start.withVertices(endVertices), colors);
    const allColorStart = arrayDefaults(colorStart, colorEnd);

    anim.set(start.solidData, allColorStart);

    transitionId.current = transition(
      {
        duration: 1000 / animationSpeed,
        startValue: {
          vertices: start.solidData.vertices,
          faceColors: allColorStart,
        },
        endValue: {
          vertices: endVertices,
          faceColors: arrayDefaults(colorEnd, colorStart),
        },
        onFinish: () => {
          setPolyhedron(result);
          anim.reset();
        },
      },
      ({ vertices, faceColors }) => {
        anim.set({ ...start.solidData, vertices }, faceColors);
      },
    );
  };

  return (
    <InterpModel.Provider>
      <TransitionContext.Provider value={transitionFn}>
        {children}
      </TransitionContext.Provider>
    </InterpModel.Provider>
  );
}

function useTransition() {
  return useContext(TransitionContext);
}

export default {
  Provider,
  useState: InterpModel.useState,
  useTransition,
};