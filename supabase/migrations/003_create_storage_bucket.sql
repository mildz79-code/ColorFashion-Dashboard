-- Create private 'financials' storage bucket for P&L xlsx files
insert into storage.buckets (id, name, public)
values ('financials', 'financials', false)
on conflict (id) do nothing;
