import type { WasteStream } from "./constants";

export interface GuideItem {
  name: string;
  stream: WasteStream;
  tip: string;
  aliases?: string[];
}

export const STREAM_GUIDE: Record<
  WasteStream,
  { what: string; examples: string[]; do: string[]; dont: string[] }
> = {
  wet: {
    what: "Biodegradable kitchen and garden waste that rots within weeks.",
    examples: ["Vegetable & fruit peels", "Leftover food", "Tea leaves, coffee grounds", "Eggshells", "Flowers, leaves"],
    do: ["Drain liquids before binning", "Compost at home or in the society pit", "Hand over daily"],
    dont: ["Plastic bags inside the green bin", "Mixing with dry waste", "Adding oil or meat to home compost"],
  },
  dry: {
    what: "Non-biodegradable, mostly recyclable waste. Keep it clean and dry.",
    examples: ["Plastic bottles & wrappers", "Paper, cardboard", "Glass bottles", "Metal cans", "Tetra packs"],
    do: ["Rinse food containers", "Flatten cartons and boxes", "Hand over twice a week or to a kabadiwala"],
    dont: ["Wet or greasy items", "Broken glass without wrapping", "Burning plastic"],
  },
  hazardous: {
    what: "Domestic hazardous and sanitary waste that harms people or soil.",
    examples: ["Sanitary pads, diapers", "Expired medicines", "Paint & chemical cans", "Tube lights, CFLs", "Syringes"],
    do: ["Wrap sanitary waste in paper and mark a red dot", "Return medicines to chemists' take-back", "Keep separate from other bins"],
    dont: ["Flushing medicines", "Throwing CFLs in dry waste", "Handing loose needles to collectors"],
  },
  e_waste: {
    what: "Anything with a plug, battery or circuit board.",
    examples: ["Old phones & chargers", "Batteries", "Earphones, cables", "Small appliances", "Bulbs & LEDs"],
    do: ["Drop at authorised e-waste collection points", "Request an e-waste pickup", "Wipe personal data first"],
    dont: ["Mixing with dry waste", "Breaking batteries open", "Selling to informal burners"],
  },
};

export const GUIDE_ITEMS: GuideItem[] = [
  { name: "Vegetable peels", stream: "wet", tip: "Great for compost.", aliases: ["peel", "sabzi", "vegetable"] },
  { name: "Leftover food", stream: "wet", tip: "Drain curries and liquids first.", aliases: ["food", "rice", "roti"] },
  { name: "Tea bags / tea leaves", stream: "wet", tip: "Remove staples from tea bags.", aliases: ["chai", "tea"] },
  { name: "Eggshells", stream: "wet", tip: "Crush them to compost faster." },
  { name: "Flowers & puja waste", stream: "wet", tip: "Separate plastic, thread and foil first.", aliases: ["puja", "garland"] },
  { name: "Coconut shell", stream: "wet", tip: "Breaks down slowly. Society composters can take it." },
  { name: "Bones & meat scraps", stream: "wet", tip: "Wet bin, not home compost." },
  { name: "Plastic bottle", stream: "dry", tip: "Rinse, crush and keep the cap on.", aliases: ["pet", "water bottle"] },
  { name: "Chips / biscuit wrapper", stream: "dry", tip: "Multi-layer plastic. Keep clean and dry.", aliases: ["packet", "wrapper"] },
  { name: "Milk packet", stream: "dry", tip: "Rinse and dry. It's valuable to recyclers.", aliases: ["doodh"] },
  { name: "Newspaper", stream: "dry", tip: "Sell to a kabadiwala.", aliases: ["paper", "akhbar"] },
  { name: "Cardboard box", stream: "dry", tip: "Flatten it. Remove tape if you can.", aliases: ["carton", "amazon box"] },
  { name: "Glass bottle / jar", stream: "dry", tip: "Wrap broken glass in newspaper and label it." },
  { name: "Aluminium can", stream: "dry", tip: "Rinse. Fully recyclable.", aliases: ["can", "tin"] },
  { name: "Tetra pack", stream: "dry", tip: "Rinse and flatten.", aliases: ["juice box"] },
  { name: "Pizza box (greasy)", stream: "dry", tip: "Tear off the greasy part into wet waste." },
  { name: "Thermocol", stream: "dry", tip: "Keep separate. Many recyclers accept clean thermocol.", aliases: ["styrofoam"] },
  { name: "Old clothes", stream: "dry", tip: "Donate if usable. Otherwise dry waste.", aliases: ["cloth", "kapde"] },
  { name: "Plastic bag", stream: "dry", tip: "Reuse or collect in bulk for recycling.", aliases: ["polythene", "carry bag"] },
  { name: "Sanitary pad / diaper", stream: "hazardous", tip: "Wrap in paper and mark with a red dot.", aliases: ["pad", "diaper", "napkin"] },
  { name: "Expired medicines", stream: "hazardous", tip: "Use pharmacy take-back boxes.", aliases: ["medicine", "tablet"] },
  { name: "Syringe / needle", stream: "hazardous", tip: "Put in a rigid bottle with the cap on." },
  { name: "Paint can", stream: "hazardous", tip: "Never pour leftovers into drains." },
  { name: "Tube light / CFL", stream: "hazardous", tip: "Contains mercury. Don't break it.", aliases: ["cfl", "tubelight"] },
  { name: "Mosquito repellent refill", stream: "hazardous", tip: "Chemical residue. Keep separate." },
  { name: "Razor / blade", stream: "hazardous", tip: "Wrap and label as sharp." },
  { name: "Battery (AA/AAA)", stream: "e_waste", tip: "Collect in a jar for e-waste drop.", aliases: ["cell", "battery"] },
  { name: "Mobile phone", stream: "e_waste", tip: "Wipe data, then give to authorised collectors.", aliases: ["phone", "smartphone"] },
  { name: "Charger / cable", stream: "e_waste", tip: "E-waste pickup or drop point.", aliases: ["wire", "usb"] },
  { name: "Earphones", stream: "e_waste", tip: "Small electronics count too." },
  { name: "LED bulb", stream: "e_waste", tip: "Contains electronics. E-waste point.", aliases: ["bulb"] },
  { name: "Laptop / keyboard", stream: "e_waste", tip: "Request an e-waste pickup." },
  { name: "Power bank", stream: "e_waste", tip: "Lithium battery, fire risk in trucks." },
];
