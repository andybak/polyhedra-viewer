import { minBy, pickBy } from "lodash-es"
import { Vector3 } from "three"
import { Face, Cap } from "math/polyhedra"
import {
  Capstone,
  Composite,
  Elementary,
  CapType,
  Align,
  Gyration,
  gyrations,
} from "specs"
import { OpArgs } from "../Operation"
import PolyhedronForme from "math/formes/PolyhedronForme"
import { GraphGenerator, OpInput, toDirected } from "../operationPairs"
import removeCap from "./removeCap"
import addCap, { CrossAxis } from "./addCap"
import CompositeForme from "math/formes/CompositeForme"
import CapstoneForme from "math/formes/CapstoneForme"

function hasRotunda(info: CutPasteSpecs) {
  if (info.isCapstone()) {
    return info.isSecondary() && info.isPentagonal()
  }
  return false
}

function getUsingOpts(info: CutPasteSpecs): CapType[] | null {
  if (hasRotunda(info)) {
    return ["cupola", "rotunda"]
  } else if (info.isCapstone()) {
    return [info.capType()]
  }
  return null
}

function hasGyrateOpts(info: CutPasteSpecs) {
  if (info.isCapstone()) {
    if (!info.isMono()) return false
    // Gyroelongated capstones are always gyro
    if (info.isGyroelongated()) return false
    // Cupolae and rotundae (that are not the gyrobifastigium) always have gyrate opts
    if (!info.isDigonal() && info.isSecondary()) return true
    return false
  }
  if (info.isComposite()) {
    return info.isGyrateSolid()
  }
  return false
}

export type CutPasteSpecs = Capstone | Composite | Elementary

export interface CapOptions {
  cap: Cap
}

interface DimGraphOpts {
  using?: CapType
  align?: Align
  gyrate?: Gyration
}

interface AugGraphOpts extends DimGraphOpts {
  faceType?: number
}

interface AugOptions {
  face: Face
  gyrate?: Gyration
  using?: CapType
}

type AugDimGraphGenerator<S> = GraphGenerator<S, AugGraphOpts, DimGraphOpts>

interface CutPastePairInput<F extends PolyhedronForme> {
  /** The bidirectional graph representing solids that can be augmented or diminished. */
  graph(): AugDimGraphGenerator<F["specs"]>
  /** How to transform the arguments to graph options for diminish */
  toDimGraphOpts?(forme: F, options: CapOptions): DimGraphOpts
  /** How to transform the arguments to graph options for augment */
  toAugGraphOpts?(forme: F, options: AugOptions): AugGraphOpts
  /** Get the axis of the polyhedron base when augmenting */
  baseAxis?(forme: F, options: AugOptions): CrossAxis | undefined
}

interface CutPastePair<F extends PolyhedronForme> {
  augment: OpInput<AugOptions, F, AugGraphOpts>
  diminish: OpInput<CapOptions, F, DimGraphOpts>
}

function defaultGraphOpts() {
  return {}
}

/**
 * Create a pair of augment/diminish operations.
 */
export function makeCutPastePair<F extends PolyhedronForme>(
  input: CutPastePairInput<F>,
): CutPastePair<F> {
  return {
    augment: {
      graph: toDirected("left", input.graph),
      toGraphOpts: input.toAugGraphOpts ?? defaultGraphOpts,
      apply(forme, options) {
        const { using, face } = options
        const baseAxis = input.baseAxis?.(forme, options)
        return addCap(forme.geom, face, baseAxis, using)
      },
    },
    diminish: {
      graph: toDirected("right", input.graph),
      toGraphOpts: input.toDimGraphOpts ?? defaultGraphOpts,
      apply: ({ geom }, { cap }) => removeCap(geom, cap),
    },
  }
}

function getModifiableCaps(forme: PolyhedronForme) {
  if (forme.isCapstone()) {
    return forme.endCaps()
  } else if (forme.isComposite()) {
    return forme.caps()
  } else {
    return forme.geom.caps({ type: "primary" })
  }
}

function getCapFaces(forme: PolyhedronForme) {
  return getModifiableCaps(forme).flatMap((cap) => cap.faces())
}

function getHitCap(forme: PolyhedronForme, hitPoint: Vector3) {
  const hitFace = forme.geom.hitFace(hitPoint)
  const caps = getModifiableCaps(forme).filter((cap) =>
    hitFace.inSet(cap.faces()),
  )
  if (caps.length === 0) {
    return null
  }
  return minBy(caps, (cap) => cap.centroid().distanceToSquared(hitPoint))
}

function wrapForme(forme: PolyhedronForme) {
  if (!Composite.hasSource(forme.specs as any)) return
  const specs = Composite.wrap(forme.specs as any)
  return CompositeForme.create(specs, forme.geom)
}

type CapOptionArgs = Partial<OpArgs<CapOptions, PolyhedronForme, DimGraphOpts>>
type AugOptionArgs = Partial<
  OpArgs<AugOptions, PolyhedronForme<CutPasteSpecs>, AugGraphOpts>
>

export const capOptionArgs: CapOptionArgs = {
  hitOption: "cap",
  hasOptions: () => true,
  allOptions(forme) {
    return { cap: getModifiableCaps(forme) }
  },
  getHitOption(forme, hitPnt) {
    const cap = getHitCap(forme, hitPnt)
    return cap ? { cap } : {}
  },
  selectionState(face, forme, { cap }) {
    const allCapFaces = getCapFaces(forme)
    if (cap && face.inSet(cap.faces())) return "selected"
    if (face.inSet(allCapFaces)) return "selectable"
    return undefined
  },
  wrap(forme) {
    if (forme.isClassical()) {
      return wrapForme(forme)
    }
  },
}

function canAugmentWrapped(prism: CapstoneForme, face: Face): boolean {
  const wrapped = wrapForme(prism)
  if (!wrapped) return false
  return canAugment(wrapped, face)
}

function canAugment(forme: PolyhedronForme, face: Face): boolean {
  if (forme.isCapstone()) {
    return forme.isEndFace(face) || canAugmentWrapped(forme, face)
  } else if (forme.isComposite()) {
    return forme.canAugment(face)
  } else {
    // Elementary solid
    return face.numSides === 4
  }
}

// TODO putting this here is a little awkward
export const augOptionArgs: AugOptionArgs = {
  hitOption: "face",
  hasOptions: () => true,
  getHitOption(forme, hitPnt) {
    const face = forme.geom.hitFace(hitPnt)
    return canAugment(forme, face) ? { face } : {}
  },
  selectionState(f, forme, { face }) {
    if (face && f.equals(face)) return "selected"
    if (canAugment(forme, f)) return "selectable"
    return undefined
  },
  allOptions(forme) {
    const { specs, geom } = forme
    return {
      gyrate: hasGyrateOpts(specs) ? gyrations : [undefined],
      using: getUsingOpts(specs) ?? [undefined],
      face: geom.faces.filter((face) => canAugment(forme, face)),
    }
  },
  defaultOptions(info) {
    const usingOpts = getUsingOpts(info) ?? []
    return pickBy({
      gyrate: hasGyrateOpts(info) && "gyro",
      using: usingOpts[0],
    })
  },
  wrap(forme) {
    if (forme.isClassical()) {
      return wrapForme(forme)
    }
  },
}
