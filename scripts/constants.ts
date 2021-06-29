import { parseUnits } from "ethers/lib/utils";

export enum NETWORKS {
  KOVAN=42,
  MATIC_MAINNET=137,
}

export const DEPLOY_CONFIGS = {
  42: {
    NAME: "Kovan",
    UBI: "",
    LINK: "0xa36085F69e2889c224210F603D836748e7dC0088",
    VRFCoordinator: "0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9",
    KEY_HASH: "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4",
    VRF_FEE: parseUnits("0.1", 18)
  },
  137: {
    NAME: "Matic Mainnet",
    UBI: "0xFe7FF8b5dfbA93A9EaB7Aee447C3c72990052d93",
    LINK: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
    VRFCoordinator: "0x3d2341ADb2D31f1c5530cDC622016af293177AE0",
    KEY_HASH: "0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
    VRF_FEE: parseUnits("0.0001", 18)
  },
}