class Rooms::Edit < BrowserAction
  route do
    room = RoomQuery.find(room_id)
    html EditPage,
      operation: SaveRoom.new(room),
      room: room
  end
end
