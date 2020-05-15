class Rooms::Index < BrowserAction
  route do
    html IndexPage, rooms: RoomQuery.new
  end
end
