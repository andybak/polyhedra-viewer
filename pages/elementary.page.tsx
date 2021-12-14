import GroupLayout from "./[polyhedron]/GroupLayout"
import { snubAntiprisms, othersTwoRows } from "lib/tables"
import PolyhedronTable from "components/MuseumPage/PolyhedronTable"

export default function UniformPage() {
  return (
    <GroupLayout position={[-15, 6, 5]} zoom={40} aspectRatio={"4 / 2"}>
      {(router: any) => {
        return (
          <>
            <group position={[0, 0, 0]}>
              <PolyhedronTable
                navigate={router}
                table={snubAntiprisms}
                colSpacing={5}
              />
            </group>
            <group position={[0, -5, 0]}>
              <PolyhedronTable
                navigate={router}
                table={othersTwoRows}
                colSpacing={5}
              />
            </group>
          </>
        )
      }}
    </GroupLayout>
  )
}
