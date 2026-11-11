/**
 * Embedded checklist definition (fallback when data/checklist.json cannot be fetched).
 * This guarantees the UI works on first load even if the JSON path fails on mobile.
 */
(function (global) {
  "use strict";

  global.GP_CHECKLIST_FALLBACK = {
    version: "1.0.0",
    appName: "Gulfport Store Walk Checklist",
    sections: [
      {
        id: "front-exterior",
        title: "Front Exterior",
        items: [
          { id: "fe-01", text: "Parking lot free of debris, potholes, and trip hazards?", required: true },
          { id: "fe-02", text: "Exterior lighting operational and adequate?", required: true },
          { id: "fe-03", text: "Store signage clean, illuminated, and in good condition?", required: true },
          { id: "fe-04", text: "Shopping cart corrals present and organized?", required: true }
        ]
      },
      {
        id: "store-entrance",
        title: "Store Entrance",
        items: [
          { id: "se-01", text: "Entrance doors clean, operational, and free of damage?", required: true },
          { id: "se-02", text: "Entry mats clean and properly placed?", required: true },
          { id: "se-03", text: "Welcome / promotional signage current and neat?", required: true }
        ]
      },
      {
        id: "front-end",
        title: "Front End",
        items: [
          { id: "fn-01", text: "Checkout lanes clean, stocked, and organized?", required: true },
          { id: "fn-02", text: "Bagging areas free of clutter and hazards?", required: true },
          { id: "fn-03", text: "Customer service desk tidy and staffed appropriately?", required: true },
          { id: "fn-04", text: "Self-checkout units clean and functioning?", required: true }
        ]
      },
      {
        id: "grocery",
        title: "Grocery Department",
        items: [
          { id: "gr-01", text: "Aisles clear of clutter and trip hazards?", required: true },
          { id: "gr-02", text: "Shelves faced, stocked, and free of out-of-date product?", required: true },
          { id: "gr-03", text: "Endcaps and displays neat and correctly signed?", required: true },
          { id: "gr-04", text: "Floor clean and dry?", required: true }
        ]
      },
      {
        id: "produce",
        title: "Produce",
        items: [
          { id: "pr-01", text: "Produce displays full, rotated, and appealing?", required: true },
          { id: "pr-02", text: "Wet racks clean and properly stocked?", required: true },
          { id: "pr-03", text: "Floor and drains free of debris and standing water?", required: true }
        ]
      },
      {
        id: "meat",
        title: "Meat Department",
        items: [
          { id: "mt-01", text: "Meat cases clean, properly temperature-controlled, and well-stocked?", required: true },
          { id: "mt-02", text: "Cutting areas and equipment clean and sanitized?", required: true },
          { id: "mt-03", text: "Date codes and labeling accurate?", required: true }
        ]
      },
      {
        id: "deli-bakery",
        title: "Deli/Bakery",
        items: [
          { id: "db-01", text: "Service cases clean, stocked, and at correct temperature?", required: true },
          { id: "db-02", text: "Slicers, ovens, and work surfaces clean?", required: true },
          { id: "db-03", text: "Hot/cold holding units operating correctly?", required: true }
        ]
      },
      {
        id: "warehouse",
        title: "Warehouse",
        items: [
          { id: "wh-01", text: "Receiving area clear and organized?", required: true },
          { id: "wh-02", text: "Pallets and product stacked safely?", required: true },
          { id: "wh-03", text: "Aisles free of debris and trip hazards?", required: true },
          { id: "wh-04", text: "Temperature-controlled storage within acceptable range?", required: true }
        ]
      },
      {
        id: "salvage",
        title: "Salvage Area",
        items: [
          { id: "sv-01", text: "Salvage area organized and free of safety hazards?", required: true },
          { id: "sv-02", text: "Damaged product properly segregated and documented?", required: true }
        ]
      },
      {
        id: "rear-exterior",
        title: "Store Rear Exterior",
        items: [
          { id: "re-01", text: "Loading dock area clean and free of debris?", required: true },
          { id: "re-02", text: "Exterior doors secure and in good condition?", required: true },
          { id: "re-03", text: "Trash compactors / dumpsters properly closed and area clean?", required: true }
        ]
      }
    ],
    closingOnlyItems: [
      { id: "cl-01", text: "Are all shopping carts in corrals in the front parking lot?", required: true },
      { id: "cl-02", text: "Have all Click2Go orders been closed?", required: true },
      { id: "cl-03", text: "Other issues noted.", required: true }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
