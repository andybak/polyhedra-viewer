import { pick } from "lodash-es"
import { useRef, useState } from "react"
import { Table } from "lib/tables"
import ConfigCtx from "components/ConfigCtx"
import { fromSpecs } from "math/formes"

import { escape } from "lib/utils"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
// FIXME edit these imports
import getFormeColors, {
  mixColor,
} from "components/ViewerPage/common/SolidScene/getFormeColors"
import PolyhedronModel from "components/ViewerPage/common/SolidScene/PolyhedronModel"

const rowSpacing = 1.75
const innerSpacing = 3

// FIXME add these typings (once we have a more concrete design)
function PolyhedronEntry({ entry, position, navigate }: any) {
  const ref = useRef<any>()
  const [hovered, setHovered] = useState(false)
  useFrame(() => {
    const rotation = ref.current?.rotation
    if (rotation) {
      rotation.x = 0.1
      // rotation.y = 0
      rotation.y += 0.0025
    }
  })
  if (!entry || typeof entry === "string") return null
  // TODO might as well make this an official method
  // (it returns false for gyrobifastigium)
  const isDupe = entry.name() !== entry.canonicalName()
  const forme = fromSpecs(entry)
  const geom = forme.orient()

  const config = ConfigCtx.useState()
  const faceColors = geom.faces.map((face) => {
    let color = getFormeColors(forme, face)
    // desaturate if it's a duplicate and decrease opacity
    if (isDupe) {
      color = mixColor(color, (c) => c.clone().offsetHSL(0, -0.5, -0.1))
    }
    if (hovered) {
      color = mixColor(color, (c) => c.clone().offsetHSL(0, 0, 0.2))
    }
    return color
  })

  const textColor = isDupe ? "#444" : "#aaa"

  return (
    <group position={position}>
      <Text
        color={textColor}
        fontSize={0.3}
        maxWidth={2}
        textAlign="center"
        anchorY="top"
        position={[0, -1.25, 0]}
      >
        {forme.specs.name()}
      </Text>
      {/* TODO duped johnson solids don't have a symbol */}
      {!isDupe && (
        <Text color={textColor} fontSize={0.75} position={[-1, -0.5, 1]}>
          {forme.specs.conwaySymbol()}
        </Text>
      )}
      <group ref={ref}>
        <PolyhedronModel
          onClick={() => navigate.push(`/${escape(entry.name())}`)}
          onPointerMove={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          value={geom.solidData}
          appearance={faceColors}
          config={pick(config, ["showFaces", "showEdges", "showInnerFaces"])}
          opacity={isDupe ? 0.33 : 1}
        />
      </group>
    </group>
  )
}

function PolyhedronEntryGroup({ entry, position, navigate }: any) {
  if (!entry || typeof entry === "string") return null
  if (entry instanceof Array) {
    return (
      <group>
        {entry.map((e, i) => {
          return (
            <PolyhedronEntry
              key={i}
              entry={e}
              navigate={navigate}
              position={[
                position[0] - innerSpacing * (0.5 - i),
                position[1],
                position[2],
              ]}
            />
          )
        })}
      </group>
    )
  }
  return (
    <PolyhedronEntry entry={entry} navigate={navigate} position={position} />
  )
}

function PolyhedronRow({ row, position, navigate, colSpacing = 7 }: any) {
  return (
    <group position={position}>
      {row.map((entry: any, i: number) => (
        <PolyhedronEntryGroup
          key={i}
          navigate={navigate}
          entry={entry}
          position={[i * colSpacing, position[1], 0]}
        />
      ))}
    </group>
  )
}

interface Props {
  table: Table
  // FIXME figure out how not to need to pass this all the way down
  navigate: any
  colSpacing?: number
}

export default function PolyhedronTable({
  table,
  navigate,
  colSpacing,
}: Props) {
  const { data } = table
  return (
    <group>
      {data.map((row, i) => (
        <PolyhedronRow
          key={i}
          row={row}
          colSpacing={colSpacing}
          navigate={navigate}
          position={[-25, 5 - i * rowSpacing, 0]}
        />
      ))}
    </group>
  )
}
