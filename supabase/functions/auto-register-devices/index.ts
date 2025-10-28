import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate random student name
function generateRandomName(): string {
  const firstNames = ['Ahmad', 'Ali', 'Fatimah', 'Nurul', 'Muhammad', 'Siti', 'Amir', 'Aisyah', 'Zainab', 'Hassan'];
  const lastNames = ['Abdullah', 'Rahman', 'Ibrahim', 'Ismail', 'Ahmad', 'Hassan', 'Ali', 'Omar', 'Yusuf', 'Khalid'];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Generate random matric number
function generateMatricNumber(index: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const paddedIndex = String(index).padStart(4, '0');
  return `${year}MAT${paddedIndex}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Fetching unique device IDs from attendance_records...');

    // Get all unique device_ids from attendance_records
    const { data: attendanceData, error: attendanceError } = await supabaseClient
      .from('attendance_records')
      .select('device_id')
      .order('device_id');

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      throw attendanceError;
    }

    // Get unique device IDs
    const uniqueDeviceIds = [...new Set(attendanceData.map((r: any) => r.device_id))];
    console.log(`Found ${uniqueDeviceIds.length} unique device IDs`);

    // Get already registered device IDs
    const { data: registeredData, error: registeredError } = await supabaseClient
      .from('registered_devices')
      .select('device_id');

    if (registeredError) {
      console.error('Error fetching registered devices:', registeredError);
      throw registeredError;
    }

    const registeredDeviceIds = new Set(registeredData.map((r: any) => r.device_id));
    console.log(`Found ${registeredDeviceIds.size} already registered devices`);

    // Filter out already registered devices
    const unregisteredDeviceIds = uniqueDeviceIds.filter(
      (id) => !registeredDeviceIds.has(id)
    );

    console.log(`Need to register ${unregisteredDeviceIds.length} new devices`);

    let newlyRegistered = 0;

    // Register new devices if any
    if (unregisteredDeviceIds.length > 0) {
      // Generate random data for each unregistered device
      const devicesToRegister = unregisteredDeviceIds.map((deviceId, index) => ({
        device_id: deviceId,
        student_name: generateRandomName(),
        matric_number: generateMatricNumber(registeredData.length + index + 1),
        class_name: null,
      }));

      console.log('Inserting new registered devices...');

      // Insert into registered_devices
      const { error: insertError } = await supabaseClient
        .from('registered_devices')
        .insert(devicesToRegister);

      if (insertError) {
        console.error('Error inserting registered devices:', insertError);
        throw insertError;
      }

      newlyRegistered = devicesToRegister.length;
    }

    // Update ALL attendance_records that have matching registered devices but missing student info
    console.log('Updating attendance records with registered device info...');
    
    const { data: allRegistered, error: allRegError } = await supabaseClient
      .from('registered_devices')
      .select('device_id, student_name, matric_number, class_name');

    if (allRegError) {
      console.error('Error fetching all registered devices:', allRegError);
      throw allRegError;
    }

    let updatedRecords = 0;
    for (const device of allRegistered) {
      const { data, error: updateError } = await supabaseClient
        .from('attendance_records')
        .update({
          student_name: device.student_name,
          matric_number: device.matric_number,
          class_name: device.class_name,
        })
        .eq('device_id', device.device_id)
        .or('matric_number.is.null,matric_number.eq.N/A,student_name.eq.Unknown')
        .select();

      if (updateError) {
        console.error(`Error updating attendance for ${device.device_id}:`, updateError);
      } else if (data) {
        updatedRecords += data.length;
      }
    }

    console.log(`Auto-registration completed: ${newlyRegistered} new devices, ${updatedRecords} attendance records updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Registered ${newlyRegistered} new devices and updated ${updatedRecords} attendance records`,
        registered: newlyRegistered,
        updated: updatedRecords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-register-devices:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
