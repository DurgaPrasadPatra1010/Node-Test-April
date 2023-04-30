  const config = {
    headers: {
      "content-type": "application/json",
    },
};
const userSchema = require("./models/UserSchema");


window.onload(
  fetchdata()
)

function fetchdata(){
    axios
      .post("/profile", JSON.stringify({}), config)
      .then((res) => {
        if (res.status !== 200) {
          alert("Failed to Read, Please try again!");
          return;
        }
        console.log(res.data);
        // const todoList = res.data.data[0].data;
  
        // if (todoList.length === 0) {
        //   alert("No more todos to show, please create some");
        //   return;
        // }
  
        // document.getElementById("item_list").insertAdjacentHTML(
        //   "beforeend",
        //   todoList
        //     .map((item) => {
        //       return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
        //     <span class="item-text"> ${item.todo} </span>
        //     <div>
        //     <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
        //     <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
        // </div>
        // </li>`;
        //     })
        //     .join("")
        // );
  
        // skip += todoList.length;
      })
      .catch((err) => {
        console.log(err);
        alert("Something went wrong!");
      });

}

