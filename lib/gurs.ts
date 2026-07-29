import { z } from "zod";

export const GURS_ORTHO_WMS_URL =
  process.env.NEXT_PUBLIC_GURS_ORTHO_WMS_URL || "https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms";
export const GURS_ORTHO_WMS_LAYER = process.env.NEXT_PUBLIC_GURS_ORTHO_WMS_LAYER || "SI.GURS.ZPDZ:DOF050";
export const GURS_ORTHO_WMS_VERSION = process.env.NEXT_PUBLIC_GURS_ORTHO_WMS_VERSION || "1.1.1";
export const GURS_ORTHO_WMS_FORMAT = process.env.NEXT_PUBLIC_GURS_ORTHO_WMS_FORMAT || "image/png";

export function buildGursOrthoWmsUrl(bbox = "{bbox-epsg-3794}") {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: GURS_ORTHO_WMS_VERSION,
    REQUEST: "GetMap",
    LAYERS: GURS_ORTHO_WMS_LAYER,
    STYLES: "",
    FORMAT: GURS_ORTHO_WMS_FORMAT,
    TRANSPARENT: "false",
    SRS: "EPSG:3794",
    WIDTH: "256",
    HEIGHT: "256",
    BBOX: bbox,
  });
  return `${GURS_ORTHO_WMS_URL}?${params.toString().replace(encodeURIComponent(bbox), bbox)}`;
}

const plannedUseSchema = z.object({
  code: z.string(),
  name: z.string(),
  sharePercent: z.number().nullable(),
  municipalityId: z.string().nullable(),
  systemDate: z.string().nullable(),
});

const actualUseSchema = z.object({
  sourceType: z.string(),
  code: z.string(),
  name: z.string(),
  sharePercent: z.number().nullable(),
  compositeUseCode: z.string().nullable(),
  systemDate: z.string().nullable(),
});

const valuationModelSchema = z.object({
  modelId: z.string().nullable(),
  modelName: z.string().nullable(),
  level: z.string().nullable(),
  generalisedValueEur: z.number(),
});

export const parcelSchema = z.object({
  eidParcel: z.string(),
  cadastralMunicipalityCode: z.string(),
  parcelNumber: z.string(),
  areaM2: z.number().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  boniteta: z.number().nullable(),
  administrativeStatus: z.string().nullable(),
  systemDate: z.string().nullable(),
  plannedUsePrimary: plannedUseSchema.nullable(),
  plannedUses: z.array(plannedUseSchema),
  actualUses: z.array(actualUseSchema),
  generalisedValueTotalEur: z.number().nullable(),
  valuationModelCount: z.number(),
  valuationModels: z.array(valuationModelSchema.passthrough()),
});

export const buildingSchema = z.object({
  eidBuilding: z.string(),
  cadastralMunicipalityCode: z.string(),
  buildingNumber: z.string(),
  buildingType: z.string().nullable(),
  yearBuilt: z.number().nullable(),
  roofRenovationYear: z.number().nullable(),
  facadeRenovationYear: z.number().nullable(),
  construction: z.string().nullable(),
  floorCount: z.number().nullable(),
  apartmentCount: z.number().nullable(),
  businessSpaceCount: z.number().nullable(),
  grossFloorAreaM2: z.number().nullable(),
  hasElectricity: z.boolean().nullable(),
  hasWater: z.boolean().nullable(),
  hasSewer: z.boolean().nullable(),
  hasGas: z.boolean().nullable(),
  status: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  buildingPartEids: z.array(z.string()),
});

export const buildingPartSchema = z.object({
  eidBuildingPart: z.string(),
  eidBuilding: z.string(),
  partNumber: z.string().nullable(),
  actualUse: z.string().nullable(),
  areaM2: z.number().nullable(),
  usableAreaM2: z.number().nullable(),
  apartmentNumber: z.string().nullable(),
  apartmentType: z.string().nullable(),
  windowRenovationYear: z.number().nullable(),
  installationRenovationYear: z.number().nullable(),
  hasElevator: z.boolean().nullable(),
  status: z.string().nullable(),
  spaceCount: z.number(),
  generalisedValueEur: z.number().nullable(),
});

export const parcelsSchema = z.array(parcelSchema);
export const buildingsSchema = z.array(buildingSchema);
export const buildingPartsSchema = z.array(buildingPartSchema);

export type Parcel = z.infer<typeof parcelSchema>;
export type Building = z.infer<typeof buildingSchema>;
export type BuildingPart = z.infer<typeof buildingPartSchema>;

export function booleanLabel(value: boolean | null) {
  return value == null ? "ni podatka" : value ? "da" : "ne";
}
