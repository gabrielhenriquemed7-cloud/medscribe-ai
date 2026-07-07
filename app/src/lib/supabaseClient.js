import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cqjovptfsvuhrrfvlaai.supabase.co";
const SUPABASE_KEY = "sb_publishable_uqaYECjQmq6u_fZdMQ5d3w_byRhIvFf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
