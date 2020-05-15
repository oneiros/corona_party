class Room < BaseModel
  JANUS_BASE = "http://localhost:8088/janus"

  table do
    column name : String
    column pin : String
  end

  def janus_id
    "2342#{id}".to_i
  end

  def setup_in_janus!
    create_in_janus unless exists_in_janus?
    create_stream_in_janus unless stream_exists_in_janus?
  end

  def create_in_janus
    session_id, plugin_id = setup_janus_session
    r = Halite.post(JANUS_BASE + "/#{session_id}/#{plugin_id}", json: {
      janus: "message",
      transaction: "1234",
      body: {
        request: "create",
        admin_key: "supersecret",
        room: janus_id,
        description: name,
        pin: pin,
        publishers: 8,
        is_private: true
      }
    })
    Log.info { r.to_s }
    parsed_response = r.parse
    return parsed_response["janus"] == "success"
  end

  def exists_in_janus? : Bool
    session_id, plugin_id = setup_janus_session
    r = Halite.post(JANUS_BASE + "/#{session_id}/#{plugin_id}", json: {
      janus: "message",
      transaction: "1234",
      body: {
        request: "exists",
        room: janus_id
      }
    })
    Log.info { r.to_s }
    parsed_response = r.parse
    return false unless parsed_response["plugindata"]["data"]["videoroom"] == "success"
    parsed_response["plugindata"]["data"]["exists"] == true
  end

  private def create_stream_in_janus
    session_id, plugin_id = setup_janus_session("streaming")
    r = Halite.post(JANUS_BASE + "/#{session_id}/#{plugin_id}", json: {
      janus: "message",
      transaction: "1234",
      body: {
        request: "create",
        admin_key: "supersecret",
        id: janus_id,
        description: name,
        pin: pin,
        is_private: true,
        type: "rtp",
        audio: true,
        video: true,
        data: false,
        audioport: 10000 + id,
        videoport: 20000 + id,
        videopt: 126,
        videortpmap: "H264/90000",
        videofmtp: "profile-level-id=42e01f;packetization-mode=1",
        audiopt: 111,
        audiortpmap: "opus/48000/2"
      }
    })
    Log.info { r.to_s }
    parsed_response = r.parse
    return parsed_response["janus"] == "success"
  end

  private def stream_exists_in_janus? : Bool
    session_id, plugin_id = setup_janus_session("streaming")
    r = Halite.post(JANUS_BASE + "/#{session_id}/#{plugin_id}", json: {
      janus: "message",
      transaction: "1234",
      body: {
        request: "exists",
        id: janus_id
      }
    })
    Log.info { r.to_s }
    parsed_response = r.parse
    parsed_response["plugindata"]["data"]["streaming"] == "info"
  end

  private def setup_janus_session(plugin : String = "videoroom")
    r = Halite.post(JANUS_BASE, json: {janus: "create", transaction: "1234"})
    Log.info { r.to_s }
    parsed_response = r.parse
    raise "poof" unless parsed_response["janus"] == "success"
    session_id = parsed_response["data"]["id"]
    r = Halite.post(JANUS_BASE + "/#{session_id}", json: {
      janus: "attach",
      plugin: "janus.plugin.#{plugin}",
      transaction: "1234"
    })
    Log.info { r.to_s }
    parsed_response = r.parse
    raise "poof" unless parsed_response["janus"] == "success"
    plugin_id = parsed_response["data"]["id"]
    {session_id, plugin_id}
  end
end
