class Rooms::Show < BrowserAction
  include Auth::AllowGuests

  route do
    room = RoomQuery.find(room_id)
    room.setup_in_janus!
    html ShowPage, room: room
  end
end
