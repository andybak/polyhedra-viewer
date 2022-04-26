import React from "react"
import Icon from "@mdi/react"

import { useStyle, scales } from "styles"
import { SrOnly } from "components/common"
import { fonts } from "styles"

import { SolidData } from "math/polyhedra"
import { hover } from "styles/common"
import { mdiBrush, mdiDownload } from "@mdi/js"
import { defaultColors } from "components/configOptions"

function formatDecimal(number: number) {
  return Number.isInteger(number) ? `${number}.0` : number
}

function vToObj(vertex: number[]) {
  return "v " + vertex.map(formatDecimal).join(" ")
}

function fToObj(face: number[]) {
  return "f " + face.map((i) => i + 1).join(" ")
}

function vToOff(vertex: number[]) {
  return vertex.map(formatDecimal).join(" ")
}

function HexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b
  })

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

function fToOff(face: number[]) {
  const faceHexColor: string = defaultColors[face.length]
  const faceRgb = HexToRgb(faceHexColor)
  return `${face.length} ${face.map((i) => i).join(" ")} ${faceRgb.r} ${
    faceRgb.g
  } ${faceRgb.b}`
}

function toObj({ vertices, faces }: SolidData) {
  const vObj = vertices.map(vToObj)
  const fObj = faces.map(fToObj)
  return vObj.concat(fObj).join("\n")
}

function toOff({ vertices, faces }: SolidData) {
  const header = `OFF\n#Produced by https://polyhedra.tessera.li/\n${vertices.length} ${faces.length} 0`
  const vObj = vertices.map(vToOff)
  const fObj = faces.map(fToOff)
  return [header].concat(vObj).concat(fObj).join("\n")
}

const fileFormats = [
  {
    ext: "json",
    serializer: JSON.stringify,
  },
  {
    ext: "obj",
    serializer: toObj,
  },
  {
    ext: "off",
    serializer: toOff,
  },
]

interface Props {
  solid: SolidData
}

function DownloadLink({
  ext,
  serializer,
  solid,
}: typeof fileFormats[0] & Props) {
  const filename = `${solid.name}.${ext}`
  const blob = new Blob([serializer(solid)], {
    type: "text/plain;charset=utf-8",
  })
  const url = window.URL.createObjectURL(blob)

  const css = useStyle({
    display: "inline-flex",
    justifyContent: "center",
    cursor: "pointer",
    padding: scales.spacing[2],
    width: scales.size[4],
    backgroundColor: "white",
    textDecoration: "none",
    border: "1px LightGray solid",
    color: "black",
    fontFamily: fonts.andaleMono,
    ...hover,

    ":not(:last-child)": {
      marginRight: scales.spacing[2],
    },
  })

  function openBrushApi(ext: string, solid: any) {
    if (ext !== "off") return
    const url = `http://localhost:40074/api/v1`
    const data = new URLSearchParams()
    data.append(`editablemodel.create.${ext}`, serializer(solid))
    fetch(url, {
      method: "post",
      body: data,
    })
  }

  let link
  if (ext === "off") {
    link = (
      <button {...css()} key={ext} onClick={() => openBrushApi(ext, solid)}>
        Open Brush&nbsp;
        <span>
          <Icon path={mdiBrush} size={scales.size[1]} />
        </span>
      </button>
    )
  } else {
    link = (
      <a {...css()} key={ext} download={filename} href={url}>
        <SrOnly>Download as</SrOnly>.{ext}{" "}
        <span>
          <Icon path={mdiDownload} size={scales.size[1]} />
        </span>
      </a>
    )
  }
  return link
}

export default function DataDownloader({ solid }: Props) {
  const heading = useStyle({
    fontFamily: fonts.times,
    fontSize: scales.font[4],
    marginBottom: scales.spacing[2],
  })
  return (
    <div>
      <h2 {...heading()}>Download model</h2>
      <div>
        {fileFormats.map((format) => (
          <DownloadLink key={format.ext} {...format} solid={solid} />
        ))}
      </div>
    </div>
  )
}
