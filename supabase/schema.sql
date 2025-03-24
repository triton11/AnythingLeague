-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table public.users (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    username text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.leagues (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    creator_id uuid references public.users(id) on delete cascade not null,
    start_date timestamp with time zone not null,
    number_of_rounds integer not null,
    upvotes_per_user integer not null,
    downvotes_per_user integer not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.league_members (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    league_id uuid references public.leagues(id) on delete cascade not null,
    total_points integer default 0 not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, league_id)
);

create table public.league_rounds (
    id uuid default uuid_generate_v4() primary key,
    league_id uuid references public.leagues(id) on delete cascade not null,
    round_number integer not null,
    theme text not null,
    submission_deadline timestamp with time zone not null,
    voting_deadline timestamp with time zone not null,
    is_submission_open boolean default true not null,
    is_voting_open boolean default false not null,
    unique(league_id, round_number)
);

create table public.submissions (
    id uuid default uuid_generate_v4() primary key,
    league_round_id uuid references public.league_rounds(id) on delete cascade not null,
    user_id uuid references public.users(id) on delete cascade not null,
    content text not null,
    content_type text not null check (content_type in ('URL', 'TEXT', 'IMAGE')),
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(league_round_id, user_id)
);

create table public.votes (
    id uuid default uuid_generate_v4() primary key,
    submission_id uuid references public.submissions(id) on delete cascade not null,
    user_id uuid references public.users(id) on delete cascade not null,
    value integer not null check (value in (-1, 1)),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(submission_id, user_id)
);

-- Create indexes
create index leagues_creator_id_idx on public.leagues(creator_id);
create index league_members_user_id_idx on public.league_members(user_id);
create index league_members_league_id_idx on public.league_members(league_id);
create index league_rounds_league_id_idx on public.league_rounds(league_id);
create index submissions_league_round_id_idx on public.submissions(league_round_id);
create index submissions_user_id_idx on public.submissions(user_id);
create index votes_submission_id_idx on public.votes(submission_id);
create index votes_user_id_idx on public.votes(user_id);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_rounds enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;

-- Create policies
create policy "Users can view their own data"
    on public.users for select
    using (auth.uid() = id);

create policy "Users can view usernames of league members"
    on public.users for select
    using (
        exists (
            select 1 from public.league_members
            where league_members.user_id = users.id
            and league_members.league_id in (
                select league_id from public.league_members
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can update their own data"
    on public.users for update
    using (auth.uid() = id);

create policy "Users can insert their own data"
    on public.users for insert
    with check (auth.uid() = id);

create policy "Service role can insert users"
    on public.users for insert
    with check (auth.role() = 'service_role');

create policy "Anyone can view leagues"
    on public.leagues for select
    using (true);

create policy "Authenticated users can create leagues"
    on public.leagues for insert
    with check (auth.uid() = creator_id);

create policy "League creators can update their leagues"
    on public.leagues for update
    using (auth.uid() = creator_id);

create policy "Anyone can view league members"
    on public.league_members for select
    using (true);

create policy "Users can join leagues"
    on public.league_members for insert
    with check (auth.uid() = user_id);

create policy "Anyone can view league rounds"
    on public.league_rounds for select
    using (true);

create policy "League creators can create rounds"
    on public.league_rounds for insert
    with check (exists (
        select 1 from public.leagues
        where id = league_id
        and creator_id = auth.uid()
    ));

create policy "League creators can update their rounds"
    on public.league_rounds for update
    using (exists (
        select 1 from public.leagues
        where id = league_id
        and creator_id = auth.uid()
    ));

create policy "Anyone can view submissions"
    on public.submissions for select
    using (true);

create policy "Users can create submissions"
    on public.submissions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own submissions"
    on public.submissions for update
    using (auth.uid() = user_id);

create policy "Anyone can view votes"
    on public.votes for select
    using (true);

create policy "Users can create votes"
    on public.votes for insert
    with check (auth.uid() = user_id); 