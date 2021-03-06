import React, { useState, useEffect } from "react";
import { logIn } from "./stitchApi/authentication";
import { changeStream } from "./stitchApi/products/changeStream";
import {
  deleteById,
  getProducts,
  updateById,
  insertProduct
} from "./stitchApi/products/repository";

const Context = React.createContext();

function ContextProvider({ children }) {
  const [productItems, setProductItems] = useState([]);

  function applyChangeStream() {
    // applied filter via pipeline expression on mongo server
    changeStream().then(stream =>
      stream.onNext(
        event => {
          console.log(event);

          setProductItems(prevItems => {
            const insertedProduct = {
              name: event.fullDocument.name,
              description: event.fullDocument.description,
              price: String(event.fullDocument.price),
              id: String(event.fullDocument._id)
            };

            console.log("inserted via stream: ", insertedProduct);
            return [...prevItems, insertedProduct];
          });
        },
        stream.onError(err => {
          console.log(err.message);
          stream.close();
        })
      )
    );
  }

  useEffect(() => {
    logIn().then(user => {
      console.log(`Logged in as anonymous user with id: ${user.id}`);
      getProducts().then(products => {
        console.log("getting products");
        setProductItems(products);
      });
      applyChangeStream();
    });
  }, []);

  function addProductItem(productItemToInsert) {
    insertProduct(productItemToInsert).then(({ insertedId }) => {
      const id = String(insertedId);
      const productItem = { ...productItemToInsert, id };
      const result = [...productItems, productItem];
      setProductItems(result);

      console.log("product items after save op.", productItems);
    });
  }

  function updateProductItem(productItem) {
    updateById(productItem).then(result => {
      console.log(result);

      setProductItems(prevItems => {
        const itemIndex = prevItems.findIndex(
          item => item.id === productItem.id
        );
        return [
          ...prevItems.slice(0, itemIndex),
          productItem,
          ...prevItems.slice(itemIndex + 1)
        ];
      });
    });
  }

  function removeProductItem(productId) {
    deleteById(productId).then(result => {
      console.log(result);
      setProductItems(prevItems =>
        prevItems.filter(item => item.id !== productId)
      );
    });
  }

  return (
    <Context.Provider
      value={{
        productItems,
        removeProductItem,
        updateProductItem,
        addProductItem
      }}
    >
      {children}
    </Context.Provider>
  );
}

export { ContextProvider, Context };
