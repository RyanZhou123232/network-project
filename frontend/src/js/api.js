(() => {
  const { createClient } = supabase;

  const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const formatIndustryInterest = (category, specialty) => {
    if (category && specialty) return `${category} / ${specialty}`;
    if (category) return category;
    return specialty || "";
  };

  const mapDbToUi = (row, { isSelf = false } = {}) => ({
    id: row.id || row.user_id,
    name: row.display_name || "User",
    bio: row.bio || "",
    university: row.school || "",
    company: row.company || "",
    industryCategory: row.industry_category || "",
    industrySpecialty: row.industry_specialty || "",
    industryInterest:
      formatIndustryInterest(row.industry_category, row.industry_specialty) ||
      row.industryInterest ||
      "",
    interactionFrequency: isSelf ? 100 : Number(row.interaction_score || 0),
    universityWikidataId: row.university_wikidata_id || "",
  });

  window.NetworkAPI = {
    client,

    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session;
    },

    async getUserId() {
      const { data } = await client.auth.getUser();
      return data.user?.id ?? null;
    },

    async signIn(email, password) {
      return client.auth.signInWithPassword({ email, password });
    },

    async signUp(email, password, displayName) {
      return client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
    },

    async signOut() {
      return client.auth.signOut();
    },

    async loadNetwork() {
      const userId = await window.NetworkAPI.getUserId();
      if (!userId) throw new Error("Not logged in");

      const { data: me, error: meError } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (meError) throw meError;

      const { data: network, error: netError } = await client.rpc("get_my_network", {
        limit_count: 50,
      });
      if (netError) throw netError;

      return [
        mapDbToUi({ ...me, id: userId }, { isSelf: true }),
        ...(network || []).map((row) => mapDbToUi(row)),
      ];
    },

    async updateMyProfile(userId, profile) {
      return client
        .from("profiles")
        .update({
          school: profile.university,
          company: profile.company,
          bio: profile.bio,
          industry_category: profile.industryCategory,
          industry_specialty: profile.industrySpecialty,
        })
        .eq("id", userId);
    },

    async sendConnectionRequest(targetId) {
      return client.rpc("send_connection_request", { target_id: targetId });
    },

    async sendConnectionRequestByEmail(email) {
      return client.rpc("send_connection_request_by_email", {
        target_email: email.trim(),
      });
    },

    async respondConnectionRequest(connectionId, status) {
      return client.rpc("respond_connection_request", {
        connection_id: connectionId,
        new_status: status,
      });
    },

    async getPendingIncomingRequests() {
      const userId = await window.NetworkAPI.getUserId();
      if (!userId) return [];

      const { data: connections, error } = await client
        .from("connections")
        .select("id, requested_by")
        .eq("status", "pending")
        .neq("requested_by", userId)
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

      if (error) throw error;
      if (!connections?.length) return [];

      const requesterIds = [...new Set(connections.map((c) => c.requested_by))];
      const { data: profiles, error: profileError } = await client
        .from("profiles")
        .select("id, display_name, bio, school, company, industry_category, industry_specialty")
        .in("id", requesterIds);

      if (profileError) throw profileError;

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      return connections.map((connection) => ({
        id: connection.id,
        requested_by: connection.requested_by,
        requester: profileMap[connection.requested_by] || { display_name: "User" },
      }));
    },

    async logInteraction(targetId, interactionType) {
      const userId = await window.NetworkAPI.getUserId();
      if (!userId || userId === targetId) return { error: null };

      return client.from("interaction_events").insert({
        actor_id: userId,
        target_id: targetId,
        interaction_type: interactionType,
      });
    },
  };
})();
