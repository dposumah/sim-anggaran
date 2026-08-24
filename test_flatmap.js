const rincianList = [
  { id: 1, rincianItemBelanjas: [{id: 101, uraian: "A"}] },
  { id: 2, rincianItemBelanjas: [] },
  { id: 3, rincianItemBelanjas: [{id: 102, uraian: "B"}] }
];

const result = rincianList.flatMap((r) => 
  (r.rincianItemBelanjas || []).map((item) => {
    return item.uraian;
  })
);

console.log(result);
