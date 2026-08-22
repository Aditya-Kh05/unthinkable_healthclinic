import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Create Admin ──────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@healthclinic.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        name: adminName,
      },
    });
    console.log(`✅ Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  // ── Create Sample Doctor ──────────────────────────
  const doctorEmail = 'dr.sharma@healthclinic.com';
  const existingDoctor = await prisma.user.findUnique({ where: { email: doctorEmail } });

  if (!existingDoctor) {
    const passwordHash = await bcrypt.hash('Doctor@123', 12);

    const doctorUser = await prisma.user.create({
      data: {
        email: doctorEmail,
        passwordHash,
        role: 'DOCTOR',
        name: 'Dr. Priya Sharma',
        phone: '+91-9876543210',
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        specialisation: 'Cardiology',
        slotDurationMin: 30,
      },
    });

    // Set working hours: Monday to Friday, 9 AM to 5 PM
    const weekdaySchedule = [1, 2, 3, 4, 5].map((day) => ({
      doctorId: doctor.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
    }));

    await prisma.doctorSchedule.createMany({ data: weekdaySchedule });

    console.log(`✅ Sample doctor created: ${doctorEmail} (Cardiology)`);
  } else {
    console.log(`ℹ️  Sample doctor already exists: ${doctorEmail}`);
  }

  // ── Create Second Sample Doctor ───────────────────
  const doctor2Email = 'dr.patel@healthclinic.com';
  const existingDoctor2 = await prisma.user.findUnique({ where: { email: doctor2Email } });

  if (!existingDoctor2) {
    const passwordHash = await bcrypt.hash('Doctor@123', 12);

    const doctor2User = await prisma.user.create({
      data: {
        email: doctor2Email,
        passwordHash,
        role: 'DOCTOR',
        name: 'Dr. Rajesh Patel',
        phone: '+91-9876543211',
      },
    });

    const doctor2 = await prisma.doctor.create({
      data: {
        userId: doctor2User.id,
        specialisation: 'Neurology',
        slotDurationMin: 20,
      },
    });

    // Set working hours: Monday to Saturday, 10 AM to 6 PM
    const scheduleData = [1, 2, 3, 4, 5, 6].map((day) => ({
      doctorId: doctor2.id,
      dayOfWeek: day,
      startTime: '10:00',
      endTime: '18:00',
    }));

    await prisma.doctorSchedule.createMany({ data: scheduleData });

    console.log(`✅ Sample doctor created: ${doctor2Email} (Neurology)`);
  } else {
    console.log(`ℹ️  Sample doctor already exists: ${doctor2Email}`);
  }

  // ── Create Sample Patient ─────────────────────────
  const patientEmail = 'patient@example.com';
  const existingPatient = await prisma.user.findUnique({ where: { email: patientEmail } });

  if (!existingPatient) {
    const passwordHash = await bcrypt.hash('Patient@123', 12);

    await prisma.user.create({
      data: {
        email: patientEmail,
        passwordHash,
        role: 'PATIENT',
        name: 'Aditya Kumar',
        phone: '+91-9876543212',
      },
    });

    console.log(`✅ Sample patient created: ${patientEmail}`);
  } else {
    console.log(`ℹ️  Sample patient already exists: ${patientEmail}`);
  }

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test Credentials:');
  console.log(`   Admin:   ${adminEmail} / ${adminPassword}`);
  console.log(`   Doctor:  ${doctorEmail} / Doctor@123`);
  console.log(`   Doctor:  ${doctor2Email} / Doctor@123`);
  console.log(`   Patient: ${patientEmail} / Patient@123`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
