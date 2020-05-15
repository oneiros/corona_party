class Me::Edit < BrowserAction
  get "/me/edit" do
    html EditPage, operation: UpdateUser.new(current_user)
  end
end
