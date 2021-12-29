import { uniq } from "lodash-es"

import { useEffect, memo } from "react"

import { useStyle, scales } from "styles"
import { media, fonts } from "styles"
import { hover, scroll, square, flexColumn, flexRow } from "styles/common"
import { operations, OpName } from "math/operations"
import {
  useApplyOperation,
  OperationCtx,
  TransitionCtx,
  PolyhedronCtx,
} from "components/ViewerPage/context"
import OperationIcon from "./OperationIcon"

const opLayout: (OpName | ".")[][] = [
  // Conway operations
  ["truncate", "sharpen", ".", "dual"],
  ["pare", "pinch", "alternate", "unalternate"],
  ["rectify", "unrectify", "semisnub", "unsnub"],
  ["expand", "contract", "snub", "twist"],
  // Cut & Paste operations
  ["augment", "diminish", ".", "gyrate"],
  // Bilateral operations
  ["elongate", "shorten", "gyroelongate", "turn"],
  ["double", "halve", "increment", "decrement"],
]

const opList = uniq(opLayout.flat())

interface Props {
  name: OpName
  disabled: boolean
}
const OpButton = memo(function ({ name, disabled }: Props) {
  const polyhedron = PolyhedronCtx.useState()
  const { operation: currentOp } = OperationCtx.useState()
  const { setOperation, unsetOperation } = OperationCtx.useActions()
  const applyOperation = useApplyOperation()
  const operation = operations[name]
  const isCurrent = !!currentOp && name === currentOp.name

  const css = useStyle(
    {
      ...flexColumn("center", "center"),
      ...hover,
      ...square("5rem"),
      border: isCurrent ? "2px #888 solid" : "1px #555 solid",
      fontFamily: fonts.verdana,
      fontSize: scales.font[7],
      color: "#aaa",
      backgroundColor: "#222",

      ":disabled": { opacity: 0.3 },
      // add spacing since we're displayed in a row
      // TODO can we do this in the parent styling?
      [media.mobile]: {
        ":not(:last-child)": { marginRight: scales.spacing[2] },
      },
    },
    [isCurrent],
  )

  const selectOperation = () => {
    if (isCurrent) {
      return unsetOperation()
    }

    if (!operation.hasOptions(polyhedron)) {
      applyOperation(operation)
    } else {
      setOperation(operation, polyhedron)
    }
  }
  return (
    <button
      {...css()}
      style={{ gridArea: name }}
      onClick={selectOperation}
      disabled={!operation.canApplyTo(polyhedron) || disabled}
    >
      <OperationIcon name={name} />
      {name}
    </button>
  )
})

const templateString = opLayout.map((line) => `"${line.join(" ")}"`).join("\n")

export default function OpGrid() {
  const { unsetOperation } = OperationCtx.useActions()
  const { isTransitioning } = TransitionCtx.useState()

  useEffect(() => {
    return () => {
      unsetOperation()
    }
  }, [unsetOperation])
  const css = useStyle({
    [media.notMobile]: {
      display: "grid",
      justifyContent: "space-between",
      gridColumnGap: scales.spacing[1],
      gridRowGap: scales.spacing[2],
      gridTemplateAreas: templateString,
    },
    [media.mobile]: {
      ...flexRow(),
      ...scroll("x"),
      width: "100%",
    },
  })
  return (
    <div {...css()}>
      {opList.map((name) => {
        if (name === ".") return null
        return <OpButton key={name} name={name} disabled={isTransitioning} />
      })}
    </div>
  )
}
