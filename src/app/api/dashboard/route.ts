import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Total counts (Khusus Dinas Pendidikan)
    const skpdCount = await prisma.skpd.count({ 
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      } 
    });
    const programCount = await prisma.program.count({
      where: { 
        skpd: { 
          tahunId: tahunData.id,
          nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
        } 
      }
    });
    
    // Aggregate pagu from RincianBelanja
    const totalPaguData = await prisma.rincianBelanja.aggregate({
      _sum: { pagu: true },
      where: { 
        subKegiatan: { 
          kegiatan: { 
            program: { 
              skpd: { 
                tahunId: tahunData.id,
                nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
              } 
            } 
          } 
        } 
      }
    });
    const totalPagu = Number(totalPaguData._sum.pagu || 0);

    // Get pagu per SKPD for charts
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      select: {
        id: true,
        nama: true,
        namaSubUnit: true,
        pagus: true, // Ceilings
        programs: {
          select: {
            kegiatans: {
              select: {
                subKegiatans: {
                  select: {
                    rincianBelanjas: {
                      select: {
                        pagu: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const skpdData = skpds.map(skpd => {
      let totalPaguSkpd = 0;
      skpd.programs.forEach(p => 
        p.kegiatans.forEach(k => 
          k.subKegiatans.forEach(sk => 
            sk.rincianBelanjas.forEach(rb => {
              totalPaguSkpd += Number(rb.pagu);
            })
          )
        )
      );

      const ceiling = skpd.pagus.length > 0 ? Number(skpd.pagus[0].ceilingAmount) : 0;
      const displayName = skpd.nama === skpd.namaSubUnit ? skpd.nama : `${skpd.nama} - ${skpd.namaSubUnit}`;

      return {
        id: skpd.id,
        nama: displayName,
        pagu: totalPaguSkpd,
        ceiling: ceiling
      };
    }).sort((a, b) => b.pagu - a.pagu); // Sort by highest pagu

    // Top 10 SKPDs for the chart
    const top10Skpd = skpdData.slice(0, 10);

    return NextResponse.json({
      summary: {
        totalPagu,
        skpdCount,
        programCount
      },
      skpdData: top10Skpd
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
