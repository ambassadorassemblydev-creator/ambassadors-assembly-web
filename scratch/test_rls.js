import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/projects/Ambassadors-Assembly/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Service Key starts with:', serviceKey?.substring(0, 20));

const supabase = createClient(supabaseUrl, serviceKey);

const test = async () => {
    try {
        const requestId = '7fa0e20f-4a9b-49fc-9d1d-ab6d6481a6ee';
        const userId = '1d0a5e21-e758-4fef-b4c5-28a8934dd494';
        
        console.log('Attempting insert...');
        const { data, error } = await supabase
            .from('prayer_intercessors')
            .insert([{
                prayer_request_id: requestId,
                user_id: userId
            }]);
            
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success:', data);
        }
    } catch (err) {
        console.error('Catch Error:', err);
    }
};

test();
